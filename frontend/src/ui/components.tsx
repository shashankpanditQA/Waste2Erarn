import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import * as Haptics from "expo-haptics";

import { useAppTheme, useThemedStyles } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING, statusMeta } from "@/src/theme/palettes";

// ---------------------------------------------------------------------------
export function AppText({
  children, style, weight = "regular", size = 14, color, numberOfLines, testID, onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  weight?: "regular" | "medium" | "semibold" | "bold";
  size?: number;
  color?: string;
  numberOfLines?: number;
  testID?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const fw: Record<string, TextStyle["fontWeight"]> = {
    regular: "400", medium: "500", semibold: "600", bold: "800",
  };
  return (
    <Text
      testID={testID}
      onPress={onPress}
      numberOfLines={numberOfLines}
      style={[{ color: color || colors.textPrimary, fontSize: size, fontWeight: fw[weight] }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
export function PrimaryButton({
  title, onPress, loading, disabled, style, variant = "primary", testID, icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "outline" | "ghost";
  testID?: string;
  icon?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const bg = variant === "primary" ? colors.primary : "transparent";
  const border = variant === "outline" ? colors.primary : "transparent";
  const fg = variant === "primary" ? colors.onPrimary : colors.primary;
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: border,
          borderRadius: RADIUS.pill,
          paddingVertical: 15,
          paddingHorizontal: SPACING.xl,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: SPACING.sm,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <AppText weight="bold" size={16} color={fg}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOpacity: c.isDark ? 0.25 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  }));
  return <View style={[s.card, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
export function StatusBadge({ status, testID }: { status: string; testID?: string }) {
  const { colors } = useAppTheme();
  const m = statusMeta(status, colors);
  return (
    <View
      testID={testID}
      style={{ backgroundColor: m.bg, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 }}
    >
      <AppText size={11} weight="bold" color={m.color}>{m.label}</AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 12,
        paddingHorizontal: SPACING.lg,
        backgroundColor: colors.background,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Pressable
        testID="header-back-button"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        hitSlop={12}
        style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
      >
        <CaretLeft size={24} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <AppText size={18} weight="bold" style={{ flex: 1 }} numberOfLines={1}>{title}</AppText>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------
export function Loading({ label }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <AppText color={colors.textSecondary} style={{ marginTop: 12 }}>{label}</AppText> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
export function EmptyState({
  icon, title, subtitle, action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: SPACING.xl, gap: SPACING.md }}>
      {icon}
      <AppText size={18} weight="bold">{title}</AppText>
      {subtitle ? (
        <AppText color={colors.textSecondary} style={{ textAlign: "center" }}>{subtitle}</AppText>
      ) : null}
      {action}
    </View>
  );
}
