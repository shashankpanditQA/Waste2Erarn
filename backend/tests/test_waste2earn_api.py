"""Backend API tests for Waste2Earn MVP.

Covers: auth, dashboard, scan analyze (positive + negatives + failover),
add-reward (pending), recyclers, pickup + QR, verify (mismatch, success,
duplicate), wallet, activity, notifications, recycler demo.
"""
import io
import os
import struct
import zlib

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")

# ---- helpers ---- #
def _png_bytes(w=32, h=32):
    """Generate a small non-blank PNG with a checker pattern (real features)."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            # variable RGB - checkerboard + gradient to avoid blank detection
            c1 = (x * 8) % 255
            c2 = (y * 8) % 255
            c3 = ((x + y) * 4) % 255
            raw += bytes([c1, c2, c3])
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw))
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/dev-login", timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("session_token")
    return j["session_token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---- auth ---- #
class TestAuth:
    def test_dev_login(self, token):
        assert token

    def test_me(self, h):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h, timeout=15)
        assert r.status_code == 200
        payload = r.json()
        u = payload.get("user", payload)
        assert u.get("email") == "demo@waste2earn.app"

    def test_unauth_dashboard(self):
        r = requests.get(f"{BASE_URL}/api/dashboard", timeout=15)
        assert r.status_code == 401


# ---- dashboard ---- #
class TestDashboard:
    def test_dashboard(self, h):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("wallet_balance", "total_recycled_kg", "co2_saved_kg",
                  "monthly_goal_kg", "monthly_progress_percent", "recent_scans"):
            assert k in d, f"missing {k}"
        assert isinstance(d["recent_scans"], list)


# ---- scans - negative ---- #
class TestScanNegative:
    def test_blank(self, h):
        r = requests.post(f"{BASE_URL}/api/scans/analyze",
                          files={"file": ("a.png", _png_bytes(), "image/png")},
                          data={"test_mode": "blank"}, headers=h, timeout=60)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is False and j["reason"] == "blank"

    def test_unsupported(self, h):
        r = requests.post(f"{BASE_URL}/api/scans/analyze",
                          files={"file": ("a.png", _png_bytes(), "image/png")},
                          data={"test_mode": "unsupported"}, headers=h, timeout=60)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is False and j["reason"] == "unsupported"
        assert j["scan"]["status"] == "unsupported"

    def test_invalid_file_type(self, h):
        r = requests.post(f"{BASE_URL}/api/scans/analyze",
                          files={"file": ("a.gif", b"GIF89a", "image/gif")},
                          headers=h, timeout=30)
        assert r.status_code == 400
        assert "JPG" in r.json().get("detail", "")

    def test_llm_failover_quota(self, h):
        r = requests.post(f"{BASE_URL}/api/scans/analyze",
                          files={"file": ("a.png", _png_bytes(), "image/png")},
                          data={"test_mode": "quota"}, headers=h, timeout=90)
        assert r.status_code == 200
        j = r.json()
        # After failover, should return valid response (ok True or classified)
        assert "provider" in j
        # provider should be the gemini fallback
        assert "gemini" in (j.get("provider") or "").lower()


# ---- full positive end-to-end ---- #
class TestE2E:
    scan_id = None
    pickup_id = None
    wallet_before = 0.0

    def test_a_positive_scan(self, h):
        # Load a real feature-rich JPEG (plastic bottle photo)
        with open("/tmp/bottle.jpg", "rb") as f:
            img = f.read()
        r = requests.post(f"{BASE_URL}/api/scans/analyze",
                          files={"file": ("bottle.jpg", img, "image/jpeg")},
                          headers=h, timeout=120)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True, j
        scan = j["scan"]
        assert scan["items"] and len(scan["items"]) >= 1
        assert scan["total_weight_kg"] > 0
        assert scan["total_value_inr"] > 0
        # value == sum(weight*rate)
        expected = round(sum(i["estimated_weight_kg"] * i["rate_per_kg"] for i in scan["items"]), 2)
        assert abs(expected - scan["total_value_inr"]) < 0.05
        assert scan["status"] == "analyzed"
        assert j["provider"] and "gpt-5.4" in j["provider"]
        TestE2E.scan_id = scan["id"]

    def test_b_wallet_before(self, h):
        r = requests.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15)
        assert r.status_code == 200
        TestE2E.wallet_before = r.json()["balance"]

    def test_c_add_reward_pending(self, h):
        assert TestE2E.scan_id
        r = requests.post(f"{BASE_URL}/api/scans/{TestE2E.scan_id}/add-reward",
                          headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] and j["reward"]["status"] == "pending"

        # wallet should NOT increase
        w = requests.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15).json()
        assert w["balance"] == TestE2E.wallet_before

    def test_d_recyclers_nearby(self, h):
        r = requests.get(f"{BASE_URL}/api/recyclers/nearby", headers=h, timeout=15)
        assert r.status_code == 200
        recs = r.json()["recyclers"]
        assert len(recs) >= 1
        assert "distance_km" in recs[0]
        # sorted asc
        dists = [x["distance_km"] for x in recs]
        assert dists == sorted(dists)

    def test_e_create_pickup(self, h):
        recs = requests.get(f"{BASE_URL}/api/recyclers/nearby", headers=h, timeout=15).json()["recyclers"]
        body = {
            "recycler_id": recs[0]["id"],
            "scan_id": TestE2E.scan_id,
            "pickup_date": "2026-02-01",
            "pickup_time": "10:00",
        }
        r = requests.post(f"{BASE_URL}/api/pickups", json=body, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()["pickup"]
        assert p["status"] == "scheduled"
        assert p["qr_code_payload"] and p["qr_short"]
        TestE2E.pickup_id = p["id"]

    def test_f_pickup_qr(self, h):
        r = requests.get(f"{BASE_URL}/api/pickups/{TestE2E.pickup_id}/qr", headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["qr_code_payload"] and j["pickup_id"] == TestE2E.pickup_id

    def test_g_verify_mismatch(self, h):
        r = requests.post(f"{BASE_URL}/api/pickups/{TestE2E.pickup_id}/verify",
                          json={"qr_payload": "WRONG|X|Y|0"}, headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is False and j["reason"] == "mismatch"

        # pickup stays scheduled
        p = requests.get(f"{BASE_URL}/api/pickups/{TestE2E.pickup_id}", headers=h, timeout=15).json()["pickup"]
        assert p["status"] == "scheduled"

    def test_h_verify_success(self, h):
        wallet_pre = requests.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15).json()["balance"]
        r = requests.post(f"{BASE_URL}/api/pickups/{TestE2E.pickup_id}/verify",
                          json={"simulate": True}, headers=h, timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is True
        assert j["commission_rate"] == 0.15
        expected_commission = round(j["total_value_inr"] * 0.15, 2)
        assert abs(j["commission_inr"] - expected_commission) < 0.05
        assert abs(j["user_credit_inr"] - (j["total_value_inr"] - j["commission_inr"])) < 0.05

        wallet_post = requests.get(f"{BASE_URL}/api/wallet", headers=h, timeout=15).json()["balance"]
        assert round(wallet_post - wallet_pre, 2) == j["user_credit_inr"]

    def test_i_duplicate_verify(self, h):
        r = requests.post(f"{BASE_URL}/api/pickups/{TestE2E.pickup_id}/verify",
                          json={"simulate": True}, headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is False and j["reason"] == "duplicate"


# ---- misc ---- #
class TestMisc:
    def test_activity(self, h):
        r = requests.get(f"{BASE_URL}/api/activity", headers=h, timeout=15)
        assert r.status_code == 200
        acts = r.json()["activities"]
        titles = {a["title"] for a in acts}
        # at least one of each expected type after e2e
        assert any("Scan" in t for t in titles)

    def test_notifications(self, h):
        r = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "notifications" in j and "unread" in j

        r2 = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=h, timeout=15)
        assert r2.status_code == 200 and r2.json()["ok"]

        r3 = requests.get(f"{BASE_URL}/api/notifications", headers=h, timeout=15)
        assert r3.json()["unread"] == 0

    def test_recycler_demo(self, h):
        r = requests.get(f"{BASE_URL}/api/recycler-demo", headers=h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["recycler"] and "mock_wallet_balance" in j["recycler"]
        assert isinstance(j["scheduled_pickups"], list)
        assert isinstance(j["ledger"], list)
