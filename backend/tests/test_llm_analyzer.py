import base64
import asyncio

import pytest

import llm_analyzer


class _Response:
    text = (
        '{"is_blank":false,"is_waste":true,"supported":true,'
        '"confidence":0.98,"items":[{"name":"Bottle","category":"Plastic",'
        '"quantity":1,"estimated_weight_kg":0.05}],"reason":"recyclable"}'
    )


class _Models:
    def __init__(self):
        self.calls = []

    async def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        return _Response()


class _Client:
    def __init__(self):
        self.aio = type("Aio", (), {"models": _Models()})()


@pytest.mark.parametrize("mime_type", ["image/jpeg", "image/png"])
def test_gemini_receives_uploaded_image_mime_type(monkeypatch, mime_type):
    client = _Client()
    monkeypatch.setattr(llm_analyzer, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(llm_analyzer.genai, "Client", lambda **_: client)

    result = asyncio.run(
        llm_analyzer.analyzer.analyze(
            base64.b64encode(b"image-bytes").decode(),
            mime_type=mime_type,
        )
    )

    assert result["provider"].startswith("gemini:")
    assert result["items"][0]["category"] == "Plastic"
    request = client.aio.models.calls[0]
    image_part = request["contents"][1]
    assert image_part.inline_data.mime_type == mime_type