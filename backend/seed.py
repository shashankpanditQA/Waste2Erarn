"""Seed mock recyclers and per-user demo sample data so the app looks alive."""
import logging
from datetime import timedelta

from catalog import RECYCLERS_SEED, MATERIALS, COMMISSION_RATE, get_material
from database import db, new_id, now_utc

logger = logging.getLogger("waste2earn.seed")

SAMPLE_THUMBS = {
    "Plastic": "https://images.unsplash.com/photo-1610478920392-95888b4b7c93?w=200&q=70",
    "Aluminum": "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=200&q=70",
    "Cardboard": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=200&q=70",
}


async def seed_recyclers():
    for rec in RECYCLERS_SEED:
        await db.recyclers.update_one(
            {"id": rec["id"]},
            {"$setOnInsert": rec},
            upsert=True,
        )
    logger.info("Recyclers seeded")


async def _add_activity(user_id, icon, title, subtitle, amount=None, when=None):
    await db.activities.insert_one({
        "id": new_id("act"),
        "user_id": user_id,
        "icon": icon,
        "title": title,
        "subtitle": subtitle,
        "amount_inr": amount,
        "created_at": when or now_utc(),
    })


async def _add_notification(user_id, title, message, when=None):
    await db.notifications.insert_one({
        "id": new_id("ntf"),
        "user_id": user_id,
        "title": title,
        "message": message,
        "read": False,
        "created_at": when or now_utc(),
    })


async def seed_new_user_sample_data(user_id: str):
    """Create a small, realistic history for a brand-new user (idempotent-ish:
    only runs when the user has no scans)."""
    existing = await db.scans.count_documents({"user_id": user_id})
    if existing:
        return

    now = now_utc()

    # ---- Sample 1: Plastic Bottle -> fully CREDITED ------------------------
    s1_weight = 0.08
    s1_mat = get_material("Plastic")
    s1_value = round(s1_weight * s1_mat["rate_per_kg"], 2)
    s1_commission = round(s1_value * COMMISSION_RATE, 2)
    s1_credit = round(s1_value - s1_commission, 2)
    s1 = {
        "id": new_id("scan"), "user_id": user_id, "image_url": SAMPLE_THUMBS["Plastic"],
        "storage_path": None,
        "items": [{"name": "Plastic Bottle", "category": "Plastic", "quantity": 2,
                   "estimated_weight_kg": s1_weight, "rate_per_kg": s1_mat["rate_per_kg"], "value_inr": s1_value}],
        "total_weight_kg": s1_weight, "total_value_inr": s1_value, "confidence": 0.94,
        "status": "credited", "created_at": now - timedelta(days=4),
    }
    await db.scans.insert_one(s1)
    r1 = {"id": new_id("rwd"), "user_id": user_id, "scan_id": s1["id"], "pickup_id": new_id("pick"),
          "expected_value_inr": s1_value, "credited_value_inr": s1_credit, "status": "credited",
          "created_at": now - timedelta(days=4)}
    await db.rewards.insert_one(r1)
    await db.reward_transactions.insert_one({"id": new_id("txn"), "user_id": user_id, "reward_id": r1["id"],
        "amount_inr": s1_credit, "status": "credited", "type": "recycling_reward",
        "label": "Reward Credited", "created_at": now - timedelta(days=3)})
    await db.platform_ledger.insert_one({"id": new_id("pl"), "pickup_id": r1["pickup_id"], "recycler_id": "REC001",
        "user_id": user_id, "total_value_inr": s1_value, "commission_rate": COMMISSION_RATE,
        "commission_inr": s1_commission, "user_credit_inr": s1_credit, "created_at": now - timedelta(days=3)})
    await _add_activity(user_id, "reward", "Reward Credited", "Plastic Bottle - verified pickup",
                        s1_credit, now - timedelta(days=3))

    # ---- Sample 2: Aluminum Can -> PENDING ---------------------------------
    s2_weight = 0.045
    s2_mat = get_material("Aluminum")
    s2_value = round(s2_weight * s2_mat["rate_per_kg"], 2)
    s2 = {
        "id": new_id("scan"), "user_id": user_id, "image_url": SAMPLE_THUMBS["Aluminum"],
        "storage_path": None,
        "items": [{"name": "Aluminum Can", "category": "Aluminum", "quantity": 3,
                   "estimated_weight_kg": s2_weight, "rate_per_kg": s2_mat["rate_per_kg"], "value_inr": s2_value}],
        "total_weight_kg": s2_weight, "total_value_inr": s2_value, "confidence": 0.9,
        "status": "pending", "created_at": now - timedelta(days=1),
    }
    await db.scans.insert_one(s2)
    r2 = {"id": new_id("rwd"), "user_id": user_id, "scan_id": s2["id"], "pickup_id": None,
          "expected_value_inr": s2_value, "credited_value_inr": 0, "status": "pending",
          "created_at": now - timedelta(days=1)}
    await db.rewards.insert_one(r2)
    await db.reward_transactions.insert_one({"id": new_id("txn"), "user_id": user_id, "reward_id": r2["id"],
        "amount_inr": s2_value, "status": "pending", "type": "recycling_reward",
        "label": "Reward Pending", "created_at": now - timedelta(days=1)})
    await _add_activity(user_id, "scan", "Scan Analyzed", "Aluminum Can - pending pickup",
                        s2_value, now - timedelta(days=1))

    # ---- Sample 3: Cardboard Box -> PICKUP SCHEDULED -----------------------
    s3_weight = 0.6
    s3_mat = get_material("Cardboard")
    s3_value = round(s3_weight * s3_mat["rate_per_kg"], 2)
    s3 = {
        "id": new_id("scan"), "user_id": user_id, "image_url": SAMPLE_THUMBS["Cardboard"],
        "storage_path": None,
        "items": [{"name": "Cardboard Box", "category": "Cardboard", "quantity": 1,
                   "estimated_weight_kg": s3_weight, "rate_per_kg": s3_mat["rate_per_kg"], "value_inr": s3_value}],
        "total_weight_kg": s3_weight, "total_value_inr": s3_value, "confidence": 0.92,
        "status": "pickup_scheduled", "created_at": now - timedelta(hours=6),
    }
    await db.scans.insert_one(s3)
    pick3_id = new_id("pick")
    r3 = {"id": new_id("rwd"), "user_id": user_id, "scan_id": s3["id"], "pickup_id": pick3_id,
          "expected_value_inr": s3_value, "credited_value_inr": 0, "status": "pending",
          "created_at": now - timedelta(hours=6)}
    await db.rewards.insert_one(r3)
    await db.pickups.insert_one({"id": pick3_id, "user_id": user_id, "recycler_id": "REC001",
        "recycler_name": "Green Earth Recycling Center", "scan_id": s3["id"],
        "qr_code_payload": f"W2E|{pick3_id}|{user_id}|{s3_value}", "qr_short": pick3_id.split("_")[-1][:8].upper(),
        "status": "scheduled", "pickup_date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        "pickup_time": "10:00 AM", "total_value_inr": s3_value, "created_at": now - timedelta(hours=6)})
    await _add_activity(user_id, "pickup", "Pickup Scheduled", "Cardboard Box with Green Earth Recycling Center",
                        None, now - timedelta(hours=6))
    await _add_notification(user_id, "Pickup confirmed",
                            "Your pickup with Green Earth Recycling Center is scheduled for tomorrow at 10:00 AM.",
                            now - timedelta(hours=6))
    await _add_notification(user_id, "Welcome to Waste2Earn 🌱",
                            "Scan your first item to start turning waste into rewards.",
                            now - timedelta(days=5))

    # ---- Update user aggregate metrics (only verified recycling counts) ----
    total_recycled = s1_weight  # only credited/verified
    co2 = round(s1_weight * s1_mat["co2_factor"], 2)
    await db.users.update_one({"user_id": user_id}, {"$set": {
        "wallet_balance": s1_credit,
        "total_earned": s1_credit,
        "total_scans": 3,
        "total_recycled_kg": round(total_recycled, 3),
        "co2_saved_kg": co2,
        "monthly_recycled_kg": round(total_recycled, 3),
    }})
    logger.info("Seeded sample data for user %s", user_id)
