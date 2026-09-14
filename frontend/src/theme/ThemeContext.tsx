import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { storage } from "@/src/utils/storage";
import { AppColors, PALETTES, ThemeName } from "./palettes";

const THEME_KEY = "w2e_theme";

interface ThemeCtx {
  themeName: ThemeName;
  colors: AppColors;
  setTheme: (name: ThemeName) => void;
  ready: boolean;
}

const Context = createContext<ThemeCtx | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("Green");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<ThemeName>(THEME_KEY, "Green");
      if (saved && PALETTES[saved]) setThemeName(saved);
      setReady(true);
    })();
  }, []);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
    storage.setItem(THEME_KEY, name);
  };

  const value = useMemo<ThemeCtx>(
    () => ({ themeName, colors: PALETTES[themeName], setTheme, ready }),
    [themeName, ready],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppTheme(): ThemeCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAppTheme must be used inside ThemeProvider");
  return ctx;
}

// Themed StyleSheet hook: rebuilds when the active theme changes.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: AppColors) => T,
): T {
  const { colors } = useAppTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
