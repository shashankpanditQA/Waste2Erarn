# App type: Expo (Expo Router frontend + FastAPI backend + MongoDB)
# Secret prefix: EXPO_PUBLIC_ (only for non-secret values such as the backend URL)
# Gemini + Geoapify calls: server (through the FastAPI backend)

Note: never put Gemini, Geoapify or Supabase service keys behind an EXPO_PUBLIC_ variable. Expo bundles those into the app and anyone can read them.
