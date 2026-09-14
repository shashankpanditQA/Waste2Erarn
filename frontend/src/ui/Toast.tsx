import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, Info, WarningCircle } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText } from "@/src/ui/components";

type ToastType = "success" | "error" | "info";
interface ToastState { message: string; type: ToastType }

const Context = createContext<{ show: (m: string, t?: ToastType) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
        setToast(null),
      );
    }, 2600);
  }, [opacity]);

  const color =
    toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.info;
  const Icon = toast?.type === "success" ? CheckCircle : toast?.type === "error" ? WarningCircle : Info;

  return (
    <Context.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 10,
            left: SPACING.lg,
            right: SPACING.lg,
            opacity,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: RADIUS.md,
              borderLeftWidth: 4,
              borderLeftColor: color,
              borderWidth: 1,
              borderColor: colors.border,
              padding: SPACING.md,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Icon size={22} color={color} weight="fill" />
            <AppText style={{ flex: 1 }} weight="medium">{toast.message}</AppText>
          </View>
        </Animated.View>
      ) : null}
    </Context.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Context);
  if (!ctx) return { show: () => {} };
  return ctx;
}
