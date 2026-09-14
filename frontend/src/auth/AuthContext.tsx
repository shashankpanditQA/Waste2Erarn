import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { api, setAuthToken, setUnauthorizedHandler } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "w2e_session_token";
const AUTH_URL = "https://auth.emergentagent.com/";

export interface AppUser {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  wallet_balance: number;
  recycler_demo_enabled?: boolean;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  signingIn: boolean;
  login: () => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Context = createContext<AuthCtx | undefined>(undefined);

function extractSessionId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const processed = useRef<Set<string>>(new Set());
  const capturedUrl = useRef<string | null>(null);

  const applyToken = async (token: string, u: AppUser) => {
    setAuthToken(token);
    await storage.secureSet(TOKEN_KEY, token);
    setUser(u);
  };

  const clearSession = async () => {
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  const processSessionId = async (sid: string) => {
    if (!sid || processed.current.has(sid)) return;
    processed.current.add(sid);
    setSigningIn(true);
    try {
      const res = await api<{ session_token: string; user: AppUser }>("/api/auth/session", {
        body: { session_id: sid },
      });
      await applyToken(res.session_token, res.user);
    } catch (e) {
      // swallow: user stays on login
    } finally {
      setSigningIn(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api<{ user: AppUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      /* ignore */
    }
  };

  const loginWithToken = async (token: string) => {
    if (!token) return;
    setAuthToken(token);
    await storage.secureSet(TOKEN_KEY, token);
    try {
      const res = await api<{ user: AppUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      await clearSession();
    }
  };

  // 401 handler -> clear session (root gate redirects)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Deep link capture (native) + web URL parse on mount
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      capturedUrl.current = url;
      const sid = extractSessionId(url);
      if (sid) processSessionId(sid);
    });
    return () => sub.remove();
  }, []);

  // Bootstrap
  useEffect(() => {
    (async () => {
      try {
        // Web: session_id may be in the URL after redirect
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const devToken = params.get("dev_token");
          if (devToken) {
            setAuthToken(devToken);
            await storage.secureSet(TOKEN_KEY, devToken);
            try {
              const res = await api<{ user: AppUser }>("/api/auth/me");
              setUser(res.user);
            } catch {
              await clearSession();
            }
            try {
              window.history.replaceState(window.history.state, "", window.location.pathname);
            } catch {}
            setLoading(false);
            return;
          }
          const sid = extractSessionId(window.location.hash) || extractSessionId(window.location.search);
          if (sid) {
            await processSessionId(sid);
            // clean the url
            try {
              window.history.replaceState(window.history.state, "", window.location.pathname);
            } catch {}
            setLoading(false);
            return;
          }
        } else {
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) {
            await processSessionId(sid);
            setLoading(false);
            return;
          }
        }

        const token = await storage.secureGet<string>(TOKEN_KEY, "");
        if (token) {
          setAuthToken(token);
          try {
            const res = await api<{ user: AppUser }>("/api/auth/me");
            setUser(res.user);
          } catch {
            await clearSession();
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async () => {
    setSigningIn(true);
    try {
      const redirectUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin + "/"
          : Linking.createURL("");
      const authUrl = `${AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = authUrl;
        return;
      }

      capturedUrl.current = null;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let url: string | null = null;
      if (result.type === "success") url = result.url;
      if (!url) url = capturedUrl.current;
      if (!url) url = await Linking.getInitialURL();
      const sid = extractSessionId(url);
      if (sid) await processSessionId(sid);
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    await clearSession();
  };

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, signingIn, login, loginWithToken, logout, refreshUser }),
    [user, loading, signingIn],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
