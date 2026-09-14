# Waste2Earn — Product Requirements & Build Log

## Original Problem Statement
Build the complete Waste2Earn Android MVP per the attached spec (skill.md). End-to-end flow:
login → home → scan (camera/gallery) → image validation → AI vision analysis → waste
classification/segregation → quantity/weight/value → pending reward → recycler discovery →
pickup scheduling → QR generation → QR verification (real scan or Simulate Recycler Scan) →
reward settlement → wallet credit → activity/notifications. Only Emergent Auth, Emergent
LLM/vision, Emergent DB allowed; Maps/SMS/Payments/QR are local/mock. LLM quota failover
harness (primary → fallback → graceful error) + token optimization. Two reference screenshots
for Home (dashboard metrics + upgraded consumer home).

## User Choices
- Auth: Emergent Google social login (+ a `dev-login` test bypass for automation/demo)
- AI vision: GPT-5.4 (primary) → Gemini-3-flash (fallback)
- Currency: ₹ (INR)
- Seed a demo account with sample data
- 4 in-app themes: Green (default), Blue, Dark, Pastel

## Architecture
- **Backend** FastAPI + MongoDB (motor). Modules: `database.py`, `catalog.py` (materials,
  rates, CO2 factors, mock recyclers, 15% commission), `seed.py`, `auth.py` (Google session
  exchange + dev-login), `llm_analyzer.py` (WasteAnalyzer failover harness), `storage_helper.py`
  (Emergent Object Storage), `server.py` (all business routes).
- **Frontend** Expo Router + React Query. Custom 4-theme system (`src/theme/palettes.ts` +
  `ThemeContext`), `AuthContext` (Google + dev_token), same-origin API client on web.
- Collections: users, user_sessions, scans, rewards, pickups, recyclers, platform_ledger,
  reward_transactions, notifications, activities.

## User Personas
- Eco-conscious individuals / households turning recyclable waste into rewards.
- Recyclers (demo view) verifying pickups and settling rewards.

## Core Requirements (static)
- Emergent Google auth; protected routes; logout; session persistence.
- Data-driven Home: Total Recycled, Wallet Balance, CO₂ Saved, Monthly Goal, Recent Scans,
  How It Works, Find Recycler, Rewards card, Choose-Your-Theme, 5-tab bottom nav.
- Scan via camera/gallery; JPG/JPEG/PNG only; blank/unsupported/ambiguous handling.
- AI structured JSON, anti-hallucination, deterministic value/CO2 math in app code.
- Pending → Pickup Scheduled → Verified → Credited lifecycle; wallet credited only on verify.
- QR generation + verification (camera scan or Simulate Recycler Scan); 15% commission split.
- No external Maps/SMS/Payments/QR APIs.

## Implemented (2026-09-14)
- ✅ Full backend with all endpoints; seeded recyclers + per-user demo sample data.
- ✅ LLM failover harness verified: gpt-5.4 primary and gemini fallback both return valid JSON;
  token-optimized compact prompt; `test_mode` harness (blank/unsupported/lowconf/quota/…).
- ✅ Emergent Object Storage for waste images.
- ✅ All screens: Splash, Login, Home, Scan, Preview, Result, Recent Scans, Scan Detail,
  Find Recycler, Schedule Pickup, Pickup QR, Verify, Reward Credited, Wallet, Activity,
  Notifications, Profile, Recycler Demo, About.
- ✅ 4 instant-switch persisted themes.
- ✅ Testing: 20/20 backend pytest + full frontend E2E PASS. Positive section-40 scenario and
  all section-41 negatives (blank, unsupported, invalid file, quota failover, QR mismatch,
  duplicate verification, pending-without-pickup) confirmed.

## Backlog / Remaining
- P1: Native build required to fully validate camera capture + live QR camera scan on device
  (Expo Go / dev build). Simulate Recycler Scan covers the demo path in preview.
- P2: Optional cleanup of RN-web deprecation warnings (shadow*/pointerEvents) — cosmetic only.
- P2: Monthly goal bonus voucher reward on 100% completion.

## Next Tasks
- Optional: multi-item segregation showcase image; recycler capacity/availability filters;
  streaks/badges for gamified retention.
