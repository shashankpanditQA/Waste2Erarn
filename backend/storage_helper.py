"""Image storage with local fallback and optional managed object storage."""
import os
from pathlib import Path

import requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "waste2earn"
LOCAL_STORAGE_ROOT = Path(
    os.environ.get("LOCAL_UPLOAD_DIR", Path(__file__).parent / "uploads")
).resolve()

_storage_key = None


def init_storage():
    global _storage_key
    if not EMERGENT_KEY:
        LOCAL_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
        return "local"
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _reset_key():
    global _storage_key
    _storage_key = None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if not EMERGENT_KEY:
        target = _local_path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        target.with_suffix(target.suffix + ".content-type").write_text(content_type)
        return {"path": path, "storage": "local"}
    key = init_storage()
    url = f"{STORAGE_URL}/objects/{path}"
    resp = requests.put(url, headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 503:
        _reset_key()
        key = init_storage()
        resp = requests.put(url, headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    if not EMERGENT_KEY:
        target = _local_path(path)
        content_type_file = target.with_suffix(target.suffix + ".content-type")
        content_type = (
            content_type_file.read_text()
            if content_type_file.exists()
            else "application/octet-stream"
        )
        return target.read_bytes(), content_type
    key = init_storage()
    url = f"{STORAGE_URL}/objects/{path}"
    resp = requests.get(url, headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _reset_key()
        key = init_storage()
        resp = requests.get(url, headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def build_path(user_id: str, ext: str) -> str:
    import uuid
    return f"{APP_NAME}/uploads/{user_id}/{uuid.uuid4().hex}.{ext}"


def _local_path(path: str) -> Path:
    target = (LOCAL_STORAGE_ROOT / path).resolve()
    if LOCAL_STORAGE_ROOT not in target.parents:
        raise ValueError("Invalid storage path")
    return target
