# Waste2Earn

Waste2Earn is a recycling rewards application. Users can scan recyclable items, review estimated value and environmental impact, schedule pickups, and track rewards. The project contains a FastAPI backend and an Expo Router frontend for Android, iOS, and web.

## Project Structure

```text
backend/       FastAPI API, MongoDB access, authentication, and tests
frontend/      Expo Router application
design_guidelines.json
```

## Requirements

- Python 3.11 or newer
- Node.js and Yarn 1.x
- MongoDB
- Expo tooling for mobile development

## Backend Setup

Create `backend/.env` with the required database settings:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=waste2earn
GEMINI_API_KEY=your_gemini_api_key
```

Waste image recognition uses Google Gemini (`gemini-2.5-flash`) through the
official Google Gen AI SDK. Gemini offers limited free-tier API usage; quotas
and regional availability are controlled by Google. The application does not
send scan images to another LLM provider.

Install the Python dependencies and start the API:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`. Its routes are prefixed with `/api`; the health response is available at `GET /api/`.

Run backend tests with:

```bash
cd backend
pytest
```

## Frontend Setup

Install dependencies and start Expo:

```bash
cd frontend
yarn install
yarn start
```

For a specific target, use:

```bash
yarn android
yarn ios
yarn web
```

Native builds use `EXPO_PUBLIC_BACKEND_URL` to reach the API. For example, create `frontend/.env` with the URL reachable from your device or emulator:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:8000
```

Web uses same-origin `/api` requests when served through the configured proxy.

## Testing and Quality

Run the frontend lint check with:

```bash
cd frontend
yarn lint
```

Never commit `.env` files, API keys, database credentials, or other secrets. The repository ignores environment files by default.

## License

This project is provided for development and demonstration purposes.
