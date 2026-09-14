"""Emergent Google Auth: session exchange, current-user dependency, logout."""
import logging
from datetime import timedelta

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import db, ensure_aware, new_id, now_utc
from seed import seed_new_user_sample_data

logger = logging.getLogger("waste2earn.auth")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

auth_router = APIRouter(prefix="/api/auth")


class SessionRequest(BaseModel):
    session_id: str


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)


async def get_current_user(request: Request) -> dict:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = header[7:].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires = ensure_aware(session.get("expires_at"))
    if expires and expires < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@auth_router.post("/session")
async def create_session(body: SessionRequest):
    session_id = body.session_id
    async with httpx.AsyncClient(timeout=30) as hc:
        resp = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session_id")
    data = resp.json()
    email = data.get("email")
    name = data.get("name") or (email.split("@")[0] if email else "User")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Incomplete session data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    is_new = existing is None
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = new_id("user")
        user = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "wallet_balance": 0.0, "reward_points": 0, "total_earned": 0.0,
            "total_scans": 0, "total_recycled_kg": 0.0, "co2_saved_kg": 0.0,
            "monthly_goal_kg": 12.0, "monthly_recycled_kg": 0.0,
            "recycler_demo_enabled": False, "created_at": now_utc(),
        }
        await db.users.insert_one(dict(user))

    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "created_at": now_utc(), "expires_at": now_utc() + timedelta(days=7),
    })

    if is_new:
        try:
            await seed_new_user_sample_data(user_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Sample seed failed for %s: %s", user_id, exc)
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})

    return {"session_token": session_token, "user": user}


@auth_router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}


@auth_router.post("/logout")
async def logout(request: Request):
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        token = header[7:].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@auth_router.post("/dev-login")
async def dev_login():
    """Test/demo helper: mints a session for a fixed demo account WITHOUT the
    Google popup so automated tests and demos can run end-to-end. Not part of
    the normal user-facing sign-in."""
    email = "demo@waste2earn.app"
    name = "Shashank"
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    is_new = existing is None
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": None,
            "wallet_balance": 0.0, "reward_points": 0, "total_earned": 0.0,
            "total_scans": 0, "total_recycled_kg": 0.0, "co2_saved_kg": 0.0,
            "monthly_goal_kg": 12.0, "monthly_recycled_kg": 0.0,
            "recycler_demo_enabled": False, "created_at": now_utc(),
        })

    session_token = f"dev_{new_id()}{new_id()}"
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "created_at": now_utc(), "expires_at": now_utc() + timedelta(days=7),
    })
    if is_new:
        try:
            await seed_new_user_sample_data(user_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Sample seed failed for %s: %s", user_id, exc)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}
