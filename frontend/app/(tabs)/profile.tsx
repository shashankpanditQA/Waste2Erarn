import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, CaretRight, ClockCounterClockwise, Info, ListChecks, Recycle, SignOut, Storefront,
} from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { useAuth } from "@/src/auth/AuthContext";
import { AppText, Card, Loading } from "@/src/ui/components";
import { formatINR } from "@/src/utils/format";

export default function Profile() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api("/api/dashboard") });
  const [demo, setDemo] = useState(!!user?.recycler_demo_enabled);

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api("/api/profile/recycler-demo", { body: { enabled } }),
  });

  const d = dash.data || {};
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: SPACING.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <AppText size={22} weight="bold">Profile</AppText>
      </View>

      {dash.isLoading ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.lg }}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={{ width: 60, height: 60, borderRadius: 30 }} />
            ) : (
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <AppText size={22} weight="bold" color={colors.onPrimary}>{initials}</AppText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <AppText size={18} weight="bold">{user?.name}</AppText>
              <AppText size={13} color={colors.textSecondary}>{user?.email}</AppText>
            </View>
          </Card>

          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Stat label="Total Scans" value={String(d.total_scans || 0)} colors={colors} />
            <Stat label="Total Earned" value={formatINR(d.total_earned)} colors={colors} />
            <Stat label="Balance" value={formatINR(d.wallet_balance)} colors={colors} />
          </View>

          <Card style={{ padding: 0 }}>
            <MenuRow icon={<ListChecks size={22} color={colors.primary} weight="fill" />} title="Recent Scans" onPress={() => router.push("/recent-scans")} colors={colors} />
            <MenuRow icon={<ClockCounterClockwise size={22} color={colors.primary} weight="fill" />} title="Activity" onPress={() => router.push("/activity")} colors={colors} />
            <MenuRow icon={<Bell size={22} color={colors.primary} weight="fill" />} title="Notifications" onPress={() => router.push("/notifications")} colors={colors} />
            <MenuRow icon={<Info size={22} color={colors.primary} weight="fill" />} title="About / Impact" onPress={() => router.push("/about")} colors={colors} last />
          </Card>

          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Storefront size={22} color={colors.primary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold">Recycler Demo View</AppText>
              <AppText size={12} color={colors.textSecondary}>Verify pickups & simulate scans</AppText>
            </View>
            <Switch
              testID="recycler-demo-toggle"
              value={demo}
              onValueChange={(v) => { setDemo(v); toggle.mutate(v); if (v) router.push("/recycler-demo"); }}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </Card>

          <Pressable testID="logout-button" onPress={logout} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, padding: SPACING.md }}>
            <SignOut size={20} color={colors.error} weight="bold" />
            <AppText weight="bold" color={colors.error}>Logout</AppText>
          </Pressable>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Recycle size={20} color={colors.muted} weight="fill" />
            <AppText size={12} color={colors.muted}>Waste2Earn · Recycle Today · A Cleaner Tomorrow</AppText>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ label, value, colors }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: "center" }}>
      <AppText weight="bold" size={16} numberOfLines={1}>{value}</AppText>
      <AppText size={11} color={colors.textSecondary} style={{ marginTop: 2, textAlign: "center" }}>{label}</AppText>
    </View>
  );
}

function MenuRow({ icon, title, onPress, colors, last }: any) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
      {icon}
      <AppText weight="semibold" style={{ flex: 1 }}>{title}</AppText>
      <CaretRight size={18} color={colors.muted} />
    </Pressable>
  );
}
