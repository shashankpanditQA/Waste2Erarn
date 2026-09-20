import base64
import logging
import math

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

from auth import auth_router, ensure_indexes, get_current_user
from catalog import (
    COMMISSION_RATE,
    DEFAULT_USER_LOCATION,
    DEMO_RECYCLER_ID,
    catalogue_list,
    get_material,
)
from database import db, new_id, now_utc
from llm_analyzer import analyzer
from seed import seed_recyclers
from storage_helper import build_path, get_object, init_storage, put_object

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("waste2earn")

app = FastAPI()
api_router = APIRouter(prefix="/api")

ALLOWED_EXT = {"jpg", "jpeg", "png"}
ALLOWED_CT = {"image/jpeg", "image/jpg", "image/png"}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(r * 2 * math.asin(math.sqrt(a)), 1)


def scan_co2(items):
    total = 0.0
    for it in items:
        mat = get_material(it.get("category"))
        if mat:
            total += float(it.get("estimated_weight_kg") or 0) * mat["co2_factor"]
    return round(total, 3)


async def add_activity(user_id, icon, title, subtitle, amount=None):
    await db.activities.insert_one({
        "id": new_id("act"), "user_id": user_id, "icon": icon, "title": title,
        "subtitle": subtitle, "amount_inr": amount, "created_at": now_utc(),
    })


async def add_notification(user_id, title, message):
    await db.notifications.insert_one({
        "id": new_id("ntf"), "user_id": user_id, "title": title, "message": message,
        "read": False, "created_at": now_utc(),
    })


# --------------------------------------------------------------------------- #
# meta
# --------------------------------------------------------------------------- #
@api_router.get("/")
async def root():
    return {"message": "Waste2Earn API"}


@api_router.get("/materials")
async def materials():
    return {"materials": catalogue_list(), "commission_rate": COMMISSION_RATE}


# --------------------------------------------------------------------------- #
# dashboard
# --------------------------------------------------------------------------- #
@api_router.get("/dashboard")
async def dashboard(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]

    pending_rewards = await db.rewards.find({"user_id": uid, "status": "pending"}, {"_id": 0}).to_list(1000)
    pending_total = round(sum(r.get("expected_value_inr", 0) for r in pending_rewards), 2)
    pickups_scheduled = await db.pickups.count_documents({"user_id": uid, "status": "scheduled"})
    recyclable_items = await db.scans.count_documents({"user_id": uid, "status": {"$ne": "unsupported"}})

    recent = await db.scans.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(4).to_list(4)

    goal = user.get("monthly_goal_kg", 12.0) or 12.0
    monthly = user.get("monthly_recycled_kg", 0.0)
    progress = min(round((monthly / goal) * 100, 1), 100) if goal else 0

    return {
        "greeting_name": user.get("name", "there"),
        "wallet_balance": round(user.get("wallet_balance", 0.0), 2),
        "total_recycled_kg": round(user.get("total_recycled_kg", 0.0), 2),
        "co2_saved_kg": round(user.get("co2_saved_kg", 0.0), 2),
        "monthly_goal_kg": goal,
        "monthly_recycled_kg": round(monthly, 2),
        "monthly_progress_percent": progress,
        "total_scans": user.get("total_scans", 0),
        "total_earned": round(user.get("total_earned", 0.0), 2),
        "recyclable_items": recyclable_items,
        "pending_rewards": pending_total,
        "pickups_scheduled": pickups_scheduled,
        "recent_scans": recent,
    }


# --------------------------------------------------------------------------- #
# scans / analyze
# --------------------------------------------------------------------------- #
@api_router.post("/scans/analyze")
async def analyze_scan(request: Request, file: UploadFile = File(...), test_mode: str = Form(None)):
    user = await get_current_user(request)
    uid = user["user_id"]

    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    ctype = (file.content_type or "").lower()
    data = await file.read()

    if ext not in ALLOWED_EXT or (ctype and ctype not in ALLOWED_CT):
        raise HTTPException(status_code=400, detail="Supported formats: JPG, JPEG and PNG only.")
    if not data:
        raise HTTPException(status_code=400, detail="No waste detected. Please upload a clear waste image.")

    b64 = base64.b64encode(data).decode()
    result = await analyzer.analyze(b64, test_mode, ctype or "image/jpeg")

    if result.get("error"):
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable. Please try again.")

    provider = result.get("provider")

    if result.get("is_blank"):
        return {"ok": False, "reason": "blank", "provider": provider,
                "message": "No waste detected. Please upload a clear photo of recyclable waste."}

    if float(result.get("confidence", 0)) < 0.5:
        return {"ok": False, "reason": "ambiguous", "provider": provider,
                "message": "We couldn't confidently identify this waste. Please upload a clearer image."}

    raw_items = result.get("items") or []
    supported_items = []
    for it in raw_items:
        mat = get_material(it.get("category"))
        if not mat or not mat["supported"]:
            continue
        weight = float(it.get("estimated_weight_kg") or 0)
        qty = int(it.get("quantity") or 1)
        value = round(weight * mat["rate_per_kg"], 2)
        supported_items.append({
            "name": it.get("name") or mat["category"], "category": mat["category"],
            "quantity": qty, "estimated_weight_kg": round(weight, 3),
            "rate_per_kg": mat["rate_per_kg"], "value_inr": value,
        })

    # upload the image (only for real, kept scans)
    image_url, storage_path = None, None
    ext_norm = "png" if ext == "png" else "jpg"
    ct = "image/png" if ext_norm == "png" else "image/jpeg"
    try:
        storage_path = build_path(uid, ext_norm)
        await run_in_threadpool(put_object, storage_path, data, ct)
        image_url = f"/api/files/{storage_path}"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Image upload failed: %s", exc)
        storage_path = None

    if not supported_items:
        scan = {
            "id": new_id("scan"), "user_id": uid, "image_url": image_url, "storage_path": storage_path,
            "items": [{"name": (raw_items[0].get("name") if raw_items else "Unknown"),
                       "category": (raw_items[0].get("category") if raw_items else "Unknown"),
                       "quantity": 1, "estimated_weight_kg": 0, "rate_per_kg": 0, "value_inr": 0}],
            "total_weight_kg": 0, "total_value_inr": 0, "confidence": float(result.get("confidence", 0)),
            "status": "unsupported", "created_at": now_utc(),
        }
        await db.scans.insert_one(dict(scan))
        await db.users.update_one({"user_id": uid}, {"$inc": {"total_scans": 1}})
        scan.pop("_id", None)
        return {"ok": False, "reason": "unsupported", "provider": provider, "scan": scan,
                "message": "This waste type is currently not supported for recycling in Waste2Earn. Please upload a supported recyclable item."}

    total_weight = round(sum(i["estimated_weight_kg"] for i in supported_items), 3)
    total_value = round(sum(i["value_inr"] for i in supported_items), 2)

    scan = {
        "id": new_id("scan"), "user_id": uid, "image_url": image_url, "storage_path": storage_path,
        "items": supported_items, "total_weight_kg": total_weight, "total_value_inr": total_value,
        "confidence": float(result.get("confidence", 0)), "status": "analyzed", "created_at": now_utc(),
    }
    await db.scans.insert_one(dict(scan))
    await db.users.update_one({"user_id": uid}, {"$inc": {"total_scans": 1}})
    await add_activity(uid, "scan", "Scan Analyzed",
                       f"{supported_items[0]['name']} - {len(supported_items)} item(s)", total_value)
    scan.pop("_id", None)
    return {"ok": True, "provider": provider, "scan": scan}


@api_router.get("/scans")
async def list_scans(request: Request, status: str = None):
    user = await get_current_user(request)
    q = {"user_id": user["user_id"]}
    if status and status != "all":
        q["status"] = status
    scans = await db.scans.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"scans": scans}


@api_router.get("/scans/{scan_id}")
async def get_scan(request: Request, scan_id: str):
    user = await get_current_user(request)
    scan = await db.scans.find_one({"id": scan_id, "user_id": user["user_id"]}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    reward = await db.rewards.find_one({"scan_id": scan_id, "user_id": user["user_id"]}, {"_id": 0})
    pickup = None
    if reward and reward.get("pickup_id"):
        pickup = await db.pickups.find_one({"id": reward["pickup_id"]}, {"_id": 0})
    return {"scan": scan, "reward": reward, "pickup": pickup}


@api_router.post("/scans/{scan_id}/add-reward")
async def add_reward(request: Request, scan_id: str):
    user = await get_current_user(request)
    uid = user["user_id"]
    scan = await db.scans.find_one({"id": scan_id, "user_id": uid}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["status"] == "unsupported" or scan.get("total_value_inr", 0) <= 0:
        raise HTTPException(status_code=400, detail="This scan is not eligible for a reward.")

    existing = await db.rewards.find_one({"scan_id": scan_id, "user_id": uid}, {"_id": 0})
    if existing:
        return {"ok": True, "reward": existing, "message": "Reward already added."}

    reward = {
        "id": new_id("rwd"), "user_id": uid, "scan_id": scan_id, "pickup_id": None,
        "expected_value_inr": scan["total_value_inr"], "credited_value_inr": 0,
        "status": "pending", "created_at": now_utc(),
    }
    await db.rewards.insert_one(dict(reward))
    await db.reward_transactions.insert_one({
        "id": new_id("txn"), "user_id": uid, "reward_id": reward["id"],
        "amount_inr": scan["total_value_inr"], "status": "pending", "type": "recycling_reward",
        "label": "Reward Pending", "created_at": now_utc(),
    })
    await db.scans.update_one({"id": scan_id}, {"$set": {"status": "pending"}})
    await add_activity(uid, "reward", "Reward Added (Pending)",
                       f"{scan['items'][0]['name']} - waiting for pickup verification", scan["total_value_inr"])
    await add_notification(uid, "Reward pending",
                           f"Rs.{scan['total_value_inr']} will be credited after pickup verification.")
    reward.pop("_id", None)
    return {"ok": True, "reward": reward}


# --------------------------------------------------------------------------- #
# recyclers
# --------------------------------------------------------------------------- #
@api_router.get("/recyclers/nearby")
async def recyclers_nearby(request: Request, lat: float = None, lng: float = None, category: str = None):
    await get_current_user(request)
    lat = lat if lat is not None else DEFAULT_USER_LOCATION["latitude"]
    lng = lng if lng is not None else DEFAULT_USER_LOCATION["longitude"]
    recyclers = await db.recyclers.find({}, {"_id": 0}).to_list(100)
    for r in recyclers:
        r["distance_km"] = haversine_km(lat, lng, r["latitude"], r["longitude"])
        r["eta_min"] = int(r["distance_km"] * 4) + 5
    if category:
        recyclers = [r for r in recyclers if category in r.get("supported", [])]
    recyclers.sort(key=lambda x: x["distance_km"])
    return {"recyclers": recyclers, "user_location": {"latitude": lat, "longitude": lng}}


# --------------------------------------------------------------------------- #
# pickups + QR
# --------------------------------------------------------------------------- #
class PickupBody(BaseModel):
    recycler_id: str
    scan_id: str
    pickup_date: str
    pickup_time: str


@api_router.post("/pickups")
async def create_pickup(request: Request, body: PickupBody):
    user = await get_current_user(request)
    uid = user["user_id"]
    scan = await db.scans.find_one({"id": body.scan_id, "user_id": uid}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    recycler = await db.recyclers.find_one({"id": body.recycler_id}, {"_id": 0})
    if not recycler:
        raise HTTPException(status_code=404, detail="Recycler not found")

    reward = await db.rewards.find_one({"scan_id": body.scan_id, "user_id": uid}, {"_id": 0})
    if not reward:
        reward = {
            "id": new_id("rwd"), "user_id": uid, "scan_id": body.scan_id, "pickup_id": None,
            "expected_value_inr": scan["total_value_inr"], "credited_value_inr": 0,
            "status": "pending", "created_at": now_utc(),
        }
        await db.rewards.insert_one(dict(reward))

    pickup_id = new_id("pick")
    short = pickup_id.split("_")[-1][:8].upper()
    payload = f"W2E|{pickup_id}|{uid}|{scan['total_value_inr']}"
    pickup = {
        "id": pickup_id, "user_id": uid, "recycler_id": body.recycler_id,
        "recycler_name": recycler["name"], "scan_id": body.scan_id,
        "qr_code_payload": payload, "qr_short": short, "status": "scheduled",
        "pickup_date": body.pickup_date, "pickup_time": body.pickup_time,
        "total_value_inr": scan["total_value_inr"], "created_at": now_utc(),
    }
    await db.pickups.insert_one(dict(pickup))
    await db.rewards.update_one({"id": reward["id"]}, {"$set": {"pickup_id": pickup_id}})
    await db.scans.update_one({"id": body.scan_id}, {"$set": {"status": "pickup_scheduled"}})
    await add_activity(uid, "pickup", "Pickup Scheduled",
                       f"{scan['items'][0]['name']} with {recycler['name']}")
    await add_notification(uid, "Pickup confirmed",
                           f"Your pickup with {recycler['name']} is scheduled for {body.pickup_date} at {body.pickup_time}.")
    pickup.pop("_id", None)
    return {"ok": True, "pickup": pickup}


@api_router.get("/pickups")
async def list_pickups(request: Request):
    user = await get_current_user(request)
    pickups = await db.pickups.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"pickups": pickups}


@api_router.get("/pickups/{pickup_id}")
async def get_pickup(request: Request, pickup_id: str):
    user = await get_current_user(request)
    pickup = await db.pickups.find_one({"id": pickup_id, "user_id": user["user_id"]}, {"_id": 0})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    return {"pickup": pickup}


@api_router.get("/pickups/{pickup_id}/qr")
async def get_pickup_qr(request: Request, pickup_id: str):
    user = await get_current_user(request)
    pickup = await db.pickups.find_one({"id": pickup_id, "user_id": user["user_id"]}, {"_id": 0})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    return {"qr_code_payload": pickup["qr_code_payload"], "qr_short": pickup["qr_short"],
            "pickup_id": pickup_id, "total_value_inr": pickup["total_value_inr"]}


class VerifyBody(BaseModel):
    qr_payload: str = None
    simulate: bool = False


@api_router.post("/pickups/{pickup_id}/verify")
async def verify_pickup(request: Request, pickup_id: str, body: VerifyBody):
    user = await get_current_user(request)
    uid = user["user_id"]
    pickup = await db.pickups.find_one({"id": pickup_id, "user_id": uid}, {"_id": 0})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")

    if pickup["status"] == "verified":
        return {"ok": False, "reason": "duplicate", "message": "This pickup has already been verified."}

    if not body.simulate:
        if not body.qr_payload or body.qr_payload != pickup["qr_code_payload"]:
            return {"ok": False, "reason": "mismatch",
                    "message": "Invalid pickup QR. Please scan the QR generated for this pickup."}

    total = round(pickup["total_value_inr"], 2)
    commission = round(total * COMMISSION_RATE, 2)
    credit = round(total - commission, 2)

    scan = await db.scans.find_one({"id": pickup["scan_id"]}, {"_id": 0})
    co2_delta = scan_co2(scan["items"]) if scan else 0
    weight_delta = scan.get("total_weight_kg", 0) if scan else 0

    reward = await db.rewards.find_one({"pickup_id": pickup_id, "user_id": uid}, {"_id": 0})
    if reward:
        await db.rewards.update_one({"id": reward["id"]},
            {"$set": {"status": "credited", "credited_value_inr": credit}})
        await db.reward_transactions.insert_one({
            "id": new_id("txn"), "user_id": uid, "reward_id": reward["id"], "amount_inr": credit,
            "status": "credited", "type": "recycling_reward", "label": "Reward Credited", "created_at": now_utc()})

    await db.platform_ledger.insert_one({
        "id": new_id("pl"), "pickup_id": pickup_id, "recycler_id": pickup["recycler_id"], "user_id": uid,
        "total_value_inr": total, "commission_rate": COMMISSION_RATE, "commission_inr": commission,
        "user_credit_inr": credit, "created_at": now_utc()})

    await db.recyclers.update_one({"id": pickup["recycler_id"]},
        {"$inc": {"mock_wallet_balance": -total, "total_paid_to_platform": commission}})
    await db.pickups.update_one({"id": pickup_id}, {"$set": {"status": "verified"}})
    if scan:
        await db.scans.update_one({"id": scan["id"]}, {"$set": {"status": "credited"}})
    await db.users.update_one({"user_id": uid}, {"$inc": {
        "wallet_balance": credit, "total_earned": credit,
        "total_recycled_kg": weight_delta, "monthly_recycled_kg": weight_delta, "co2_saved_kg": co2_delta}})

    await add_activity(uid, "reward", "Reward Credited",
                       f"{scan['items'][0]['name'] if scan else 'Waste'} - verified pickup", credit)
    await add_notification(uid, "Reward credited",
                           f"Rs.{credit} has been credited to your wallet for a verified pickup.")

    return {"ok": True, "total_value_inr": total, "commission_rate": COMMISSION_RATE,
            "commission_inr": commission, "user_credit_inr": credit,
            "new_wallet_balance": round(user.get("wallet_balance", 0) + credit, 2)}


# --------------------------------------------------------------------------- #
# wallet / activity / notifications
# --------------------------------------------------------------------------- #
@api_router.get("/wallet")
async def wallet(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    pending = await db.rewards.find({"user_id": uid, "status": "pending"}, {"_id": 0}).to_list(1000)
    pending_total = round(sum(r.get("expected_value_inr", 0) for r in pending), 2)

    txns = await db.reward_transactions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    ledger = await db.platform_ledger.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    transactions = []
    for t in txns:
        transactions.append({"label": t.get("label", "Reward"), "amount_inr": t["amount_inr"],
                             "status": t["status"], "direction": "credit" if t["status"] == "credited" else "pending",
                             "created_at": t["created_at"]})
    for l in ledger:
        transactions.append({"label": "Platform Commission", "amount_inr": l["commission_inr"],
                             "status": "commission", "direction": "debit", "created_at": l["created_at"]})
    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "balance": round(user.get("wallet_balance", 0.0), 2),
        "total_earned": round(user.get("total_earned", 0.0), 2),
        "pending": pending_total,
        "transactions": transactions,
    }


@api_router.get("/activity")
async def activity(request: Request):
    user = await get_current_user(request)
    items = await db.activities.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"activities": items}


@api_router.get("/notifications")
async def notifications(request: Request):
    user = await get_current_user(request)
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"notifications": items, "unread": unread}


@api_router.post("/notifications/{notif_id}/read")
async def read_notification(request: Request, notif_id: str):
    user = await get_current_user(request)
    await db.notifications.update_one({"id": notif_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def read_all_notifications(request: Request):
    user = await get_current_user(request)
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


# --------------------------------------------------------------------------- #
# profile / recycler demo
# --------------------------------------------------------------------------- #
class ToggleBody(BaseModel):
    enabled: bool


@api_router.post("/profile/recycler-demo")
async def toggle_recycler_demo(request: Request, body: ToggleBody):
    user = await get_current_user(request)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"recycler_demo_enabled": body.enabled}})
    return {"ok": True, "enabled": body.enabled}


@api_router.get("/recycler-demo")
async def recycler_demo(request: Request):
    user = await get_current_user(request)
    recycler = await db.recyclers.find_one({"id": DEMO_RECYCLER_ID}, {"_id": 0})
    pickups = await db.pickups.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    scheduled = [p for p in pickups if p["status"] == "scheduled"]
    verified = [p for p in pickups if p["status"] == "verified"]
    ledger = await db.platform_ledger.find({"recycler_id": DEMO_RECYCLER_ID}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"recycler": recycler, "scheduled_pickups": scheduled, "verified_pickups": verified, "ledger": ledger}


# --------------------------------------------------------------------------- #
# image serving
# --------------------------------------------------------------------------- #
@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    scan = await db.scans.find_one({"storage_path": path}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=content, media_type=ctype)


# --------------------------------------------------------------------------- #
# wiring
# --------------------------------------------------------------------------- #
app.include_router(auth_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await ensure_indexes()
        await seed_recyclers()
    except Exception as exc:  # noqa: BLE001
        logger.error("Startup init failed: %s", exc)
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Object storage init failed (uploads may retry): %s", exc)


@app.on_event("shutdown")
async def shutdown():
    from database import client
    client.close()
