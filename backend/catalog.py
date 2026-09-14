"""Deterministic supported-material catalogue, pricing, CO2 factors and mock recyclers.

All business math (value, CO2) is derived from this configurable data - the LLM
never computes final reward or environmental numbers.
"""

COMMISSION_RATE = 0.15  # platform commission on settlement

# Each material: rate per kg (INR) and CO2 saved factor (kg CO2 per kg recycled).
MATERIALS = {
    "Plastic": {"label": "Plastic", "rate_per_kg": 15.0, "co2_factor": 1.5, "supported": True},
    "Paper": {"label": "Paper", "rate_per_kg": 8.0, "co2_factor": 1.1, "supported": True},
    "Cardboard": {"label": "Cardboard", "rate_per_kg": 6.0, "co2_factor": 0.9, "supported": True},
    "Glass": {"label": "Glass", "rate_per_kg": 2.0, "co2_factor": 0.3, "supported": True},
    "Metal": {"label": "Metal", "rate_per_kg": 40.0, "co2_factor": 4.0, "supported": True},
    "Aluminum": {"label": "Aluminum", "rate_per_kg": 90.0, "co2_factor": 9.0, "supported": True},
    "E-waste": {"label": "E-waste", "rate_per_kg": 60.0, "co2_factor": 2.5, "supported": True},
}

SUPPORTED_CATEGORIES = list(MATERIALS.keys())


def get_material(category: str):
    if not category:
        return None
    for key, val in MATERIALS.items():
        if key.lower() == category.strip().lower():
            return {"category": key, **val}
    return None


def catalogue_list():
    return [{"category": k, **v} for k, v in MATERIALS.items()]


# Seeded mock recyclers (no external maps). Located around Meerut / Delhi NCR.
RECYCLERS_SEED = [
    {
        "id": "REC001",
        "name": "Green Earth Recycling Center",
        "latitude": 28.9845,
        "longitude": 77.7064,
        "service_area": "Meerut",
        "supported": ["Plastic", "Paper", "Metal", "Cardboard"],
        "availability": "Available",
        "rating": 4.5,
        "reviews": 120,
        "mock_wallet_balance": 50000,
        "total_paid_to_platform": 0,
    },
    {
        "id": "REC002",
        "name": "EcoCycle Solutions",
        "latitude": 28.9931,
        "longitude": 77.6810,
        "service_area": "Meerut",
        "supported": ["Plastic", "Glass", "Aluminum", "E-waste"],
        "availability": "Available",
        "rating": 4.7,
        "reviews": 89,
        "mock_wallet_balance": 60000,
        "total_paid_to_platform": 0,
    },
    {
        "id": "REC003",
        "name": "ReNew Scrap & Metals",
        "latitude": 28.9700,
        "longitude": 77.7200,
        "service_area": "Meerut",
        "supported": ["Metal", "Aluminum", "E-waste"],
        "availability": "Available",
        "rating": 4.3,
        "reviews": 54,
        "mock_wallet_balance": 45000,
        "total_paid_to_platform": 0,
    },
    {
        "id": "REC004",
        "name": "CleanCity Recyclers",
        "latitude": 29.0100,
        "longitude": 77.6900,
        "service_area": "Meerut",
        "supported": ["Plastic", "Paper", "Cardboard", "Glass", "Metal", "Aluminum", "E-waste"],
        "availability": "Available",
        "rating": 4.8,
        "reviews": 210,
        "mock_wallet_balance": 75000,
        "total_paid_to_platform": 0,
    },
]

DEMO_RECYCLER_ID = "REC001"

# Demo/default user location when device location is unavailable.
DEFAULT_USER_LOCATION = {"latitude": 28.9800, "longitude": 77.7000}
