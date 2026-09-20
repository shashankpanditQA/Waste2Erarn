# Waste2Earn Architecture

## Application type

Waste2Earn uses one **Expo Router** application for:

- Android
- iOS
- Web

The frontend is not a Vite application. Expo uses Metro for development and
web bundling.

The backend is a Python FastAPI service that exposes routes under `/api`.

## Environment variables

### Client-visible configuration

Expo variables that must be available in frontend code use the
`EXPO_PUBLIC_` prefix:

```env
EXPO_PUBLIC_BACKEND_URL=https://your-api.example.com
```

Variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle.
They must never contain API keys, passwords, database credentials, or other
secrets.

`VITE_` variables are not used because this project does not use Vite.

### Server-only secrets

The following values belong in Replit Secrets and must not use a public
prefix:

```env
GEMINI_API_KEY=
GEOAPIFY_API_KEY=
MONGO_URL=
DB_NAME=
```

Do not commit these values to Git or expose them through frontend environment
variables.

## External API boundary

Gemini and Geoapify requests must be made by the FastAPI backend:

```text
Expo app (web/mobile)
        |
        | HTTPS /api/*
        v
FastAPI backend
        |
        +--> Gemini API
        |
        +--> Geoapify API
```

This design:

- Keeps Gemini and Geoapify keys out of web and mobile bundles.
- Gives both platforms one consistent API contract.
- Allows authentication, validation, rate limiting, and error handling in one
  place.
- Prevents users from extracting provider credentials from a built app.

The Expo application should send images and location queries to the backend.
It should not call Gemini or Geoapify directly.

## Image analysis flow

```text
Camera or gallery
  -> Expo image picker
  -> Preview screen
  -> Multipart upload to POST /api/scans/analyze
  -> FastAPI validates JPEG/PNG
  -> Gemini analyzes the image
  -> FastAPI calculates value and environmental impact
  -> Result returned to the Expo app
```

Camera captures and gallery selections use the same preview and upload
pipeline. The backend forwards the uploaded image's real MIME type to Gemini.

## Git branches

Feature work is organized from `develop`:

- `feature/supabase-backend`
- `feature/gemini-ai`
- `feature/geoapify`
- `feature/qr-scanner`
- `feature/qr-verification`
- `feature/integration-wallet`
- `feature/testing-qa`

## Feature ownership

| Feature | Owners |
| --- | --- |
| Supabase | Kishor, Shiva Prakash, Pawan, Ashwamegh |
| Gemini | Shivakumar, Pawan, Ashwamegh |
| Geoapify | Shashank, Pawan, Ashwamegh |

The corresponding implementation branches are:

- Supabase: `feature/supabase-backend`
- Gemini: `feature/gemini-ai`
- Geoapify: `feature/geoapify`