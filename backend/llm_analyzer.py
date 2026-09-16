"""Waste vision analyzer with Emergent LLM provider failover harness.

Primary: openai/gpt-5.4  ->  Fallback: gemini/gemini-3-flash-preview  ->  graceful error.
Deterministic value/CO2 math is done by application code, not the LLM.
"""
import json
import logging
import os
import re
import uuid

import asyncio

from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

logger = logging.getLogger("waste2earn.llm")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

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

# Primary -> fallback ordering. Both are approved Emergent-managed providers.
PROVIDERS = [
    ("openai", "gpt-5.4"),
    ("gemini", "gemini-3-flash-preview"),
]


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
    PROVIDER_TIMEOUT = 22  # seconds per provider; keeps us under ingress limits

    async def _call(self, provider: str, model: str, image_base64: str) -> dict:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"waste-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_MSG,
        ).with_model(provider, model)
        msg = UserMessage(text=PROMPT, file_contents=[ImageContent(image_base64=image_base64)])
        raw = await asyncio.wait_for(chat.send_message(msg), timeout=self.PROVIDER_TIMEOUT)
        return _parse(raw)

    async def analyze(self, image_base64: str, test_mode: str = None) -> dict:
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
        if test_mode == "invalid_json":
            # exercise: primary returns garbage -> fallback recovers
            pass

        # Force the primary provider to "fail" so the fallback path is exercised.
        force_primary_fail = test_mode in ("quota", "rate_limit", "provider_unavailable", "timeout")

        last_error = None
        for idx, (provider, model) in enumerate(PROVIDERS):
            if idx == 0 and force_primary_fail:
                logger.warning("LLM harness: simulating primary '%s:%s' failure (%s); switching to fallback",
                               provider, model, test_mode)
                continue
            try:
                data = await self._call(provider, model, image_base64)
                data["provider"] = f"{provider}:{model}"
                if idx > 0:
                    logger.info("LLM provider switch succeeded on fallback %s:%s", provider, model)
                return data
            except Exception as exc:  # noqa: BLE001 - quota/rate/parse/etc.
                last_error = exc
                logger.warning("LLM provider %s:%s failed (%s); trying next", provider, model, exc)
                continue

        logger.error("All LLM providers failed: %s", last_error)
        return {"error": "llm_unavailable", "detail": str(last_error) if last_error else "unknown"}


analyzer = WasteAnalyzer()
