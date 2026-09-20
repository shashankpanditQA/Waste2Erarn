"""Waste vision analyzer using Google's Gemini API.

Deterministic value/CO2 math is done by application code, not the LLM.
"""
import json
import logging
import os
import re

import asyncio

from google import genai
from google.genai import types

logger = logging.getLogger("waste2earn.llm")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

SYSTEM_MSG = "You are a recycling waste identifier. Return ONLY compact minified JSON. No prose, no markdown."

# Compact, token-optimized prompt (no redundant context, structured JSON out).
PROMPT = (
    "TASK: Identify recyclable waste in the image.\n"
    "RULES: JSON only. Supported categories: Plastic, Paper, Cardboard, Glass, Metal, Aluminum, E-waste.\n"
    "If blank/no meaningful object: is_blank=true. If item not in supported categories: supported=false.\n"
    "Never invent quantity/weight. Give realistic per-item weight in kg. Segregate multiple materials.\n"
    'OUTPUT: {"is_blank":bool,"is_waste":bool,"supported":bool,"confidence":number,'
    '"items":[{"name":str,"category":str,"quantity":int,"estimated_weight_kg":number}],"reason":str}'
)

def _parse(raw: str) -> dict:
    if not raw:
        raise ValueError("empty response")
    text = raw.strip()
    # strip code fences if present
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("no json object found")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("json is not an object")
    return data


class WasteAnalyzer:
    PROVIDER_TIMEOUT = 25

    async def _call(self, image_base64: str, mime_type: str) -> dict:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        client = genai.Client(api_key=GEMINI_API_KEY)
        image = types.Part.from_bytes(
            data=__import__("base64").b64decode(image_base64),
            mime_type=mime_type,
        )
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=[PROMPT, image],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_MSG,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            ),
            timeout=self.PROVIDER_TIMEOUT,
        )
        return _parse(response.text or "")

    async def analyze(
        self,
        image_base64: str,
        test_mode: str = None,
        mime_type: str = "image/jpeg",
    ) -> dict:
        """Return structured, validated analysis dict. test_mode drives the harness."""
        # ---- Harness simulations (section 43) --------------------------------
        if test_mode == "blank":
            return {"is_blank": True, "is_waste": False, "supported": False, "confidence": 0.9,
                    "items": [], "reason": "simulated blank image", "provider": "harness"}
        if test_mode == "unsupported":
            return {"is_blank": False, "is_waste": True, "supported": False, "confidence": 0.88,
                    "items": [{"name": "Banana Peel", "category": "Organic", "quantity": 1, "estimated_weight_kg": 0.1}],
                    "reason": "simulated unsupported organic waste", "provider": "harness"}
        if test_mode == "lowconf":
            return {"is_blank": False, "is_waste": True, "supported": True, "confidence": 0.2,
                    "items": [{"name": "Unclear item", "category": "Plastic", "quantity": 1, "estimated_weight_kg": 0.05}],
                    "reason": "simulated low confidence", "provider": "harness"}
        try:
            data = await self._call(image_base64, mime_type)
            data["provider"] = f"gemini:{GEMINI_MODEL}"
            return data
        except Exception as exc:  # noqa: BLE001 - API/timeout/parse errors
            logger.error("Gemini analysis failed: %s", exc)
            return {"error": "llm_unavailable", "detail": str(exc)}


analyzer = WasteAnalyzer()
