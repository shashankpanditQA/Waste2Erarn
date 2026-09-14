import { Platform } from "react-native";

// On web the app is served behind the same ingress that proxies /api -> backend,
// so use same-origin relative calls (avoids cross-preview-domain CORS). On native
// there is no "origin", so use the configured backend URL.
const BASE = Platform.OS === "web" ? "" : process.env.EXPO_PUBLIC_BACKEND_URL;

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export interface ApiError {
  status: number;
  detail: string;
  data?: any;
}

interface Options {
  method?: string;
  body?: any;
  form?: FormData;
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let payload: any;
  if (opts.form) {
    payload = opts.form; // do not set Content-Type; runtime adds boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || (payload ? "POST" : "GET"),
    headers,
    body: payload,
  });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw { status: 401, detail: "Session expired" } as ApiError;
  }

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw { status: res.status, detail: data.detail || "Something went wrong", data } as ApiError;
  }
  return data as T;
}

// Build a multipart form for image upload that works on web and native.
export async function buildImageForm(uri: string, name: string, type: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  return form;
}

export function fileUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${BASE}${imageUrl}`;
}
