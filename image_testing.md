# Image Integration Testing Rules

## Image Handling Rules
- Always use base64-encoded images for all tests and requests.
- Accepted formats: JPEG, PNG, WEBP only.
- Do not use SVG, BMP, HEIC, or other formats.
- Do not upload blank, solid-color, or uniform-variance images (they trip the blank-image validation).
- Every image must contain real visual features (objects, edges, textures, shadows).
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload.
  - If a `.jpg` is actually PNG after conversion, re-detect and update the MIME.
- If the image is animated (GIF/APNG/WEBP animation), extract the first frame only.
- Resize large images to reasonable bounds (avoid oversized payloads).

## Waste2Earn harness note
The `/api/scans/analyze` endpoint accepts a `test_mode` form field to deterministically
exercise the harness without a real image dependency:
- `test_mode=blank` -> blank/no-waste result
- `test_mode=unsupported` -> supported=false
- `test_mode=lowconf` -> ambiguous / low confidence
- `test_mode=quota` (or rate_limit / provider_unavailable / timeout) -> forces primary
  LLM failure and succeeds via the fallback Gemini provider.
When `test_mode` is omitted, the real GPT-5.4 -> Gemini-3-flash vision pipeline runs.
