import { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  ArrowRight, Bell, CaretRight, Camera, CurrencyInr, Gift, Leaf, MapPin,
  PaintBrush, Recycle, Wallet as WalletIcon,
} from "phosphor-react-native";

import { api, fileUrl } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING, THEME_SWATCH } from "@/src/theme/palettes";
import type { ThemeName } from "@/src/theme/palettes";
import { AppText, Card, StatusBadge } from "@/src/ui/components";
import { formatINR, formatKg, greeting } from "@/src/utils/format";

const THEME_NAMES: ThemeName[] = ["Green", "Blue", "Dark", "Pastel"];

export default function Home() {
  const { colors, themeName, setTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api("/api/dashboard") });
  const notif = useQuery({ queryKey: ["notifications"], queryFn: () => api("/api/notifications") });

  const onRefresh = useCallback(() => {
    dash.refetch();
    notif.refetch();
  }, []);

  const d = dash.data || {};
  const recent = d.recent_scans || [];
  const unread = notif.data?.unread || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ---- Sticky brand header ---- */}
      <View
        style={{
          paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: SPACING.lg,
          backgroundColor: colors.background, flexDirection: "row", alignItems: "center",
          borderBottomWidth: 1, borderBottomColor: colors.divider, gap: SPACING.sm,
        }}
      >
        <View
          style={{
            width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Recycle size={22} color={colors.onPrimary} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText size={18} weight="bold">Waste2Earn</AppText>
          <AppText size={11} color={colors.textSecondary}>Recycle Today · A Cleaner Tomorrow</AppText>
        </View>

        <Pressable
          testID="wallet-chip"
          onPress={() => router.push("/(tabs)/rewards")}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surface,
            borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 6,
            borderWidth: 1, borderColor: colors.border,
          }}
        >
          <WalletIcon size={16} color={colors.primary} weight="fill" />
          <AppText weight="bold" size={13}>{formatINR(d.wallet_balance)}</AppText>
        </Pressable>

        <Pressable testID="notifications-button" onPress={() => router.push("/notifications")} hitSlop={8}>
          <Bell size={24} color={colors.textPrimary} />
          {unread > 0 ? (
            <View
              style={{
                position: "absolute", top: -2, right: -2, backgroundColor: colors.error,
                borderRadius: 8, minWidth: 15, height: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
              }}
            >
              <AppText size={9} weight="bold" color={colors.onStatus}>{unread}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dash.isFetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ---- Greeting ---- */}
        <View>
          <AppText size={22} weight="bold" testID="home-greeting">
            {greeting()}, {d.greeting_name || "there"} 👋
          </AppText>
          <AppText color={colors.textSecondary}>Turn your waste into rewards.</AppText>
        </View>

        {/* ---- Hero banner ---- */}
        <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: RADIUS.xl, padding: SPACING.xl, overflow: "hidden" }}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: SPACING.sm }}>
              <AppText size={24} weight="bold" color="#FFFFFF">Turn Your Waste into Rewards</AppText>
              <AppText size={13} color="rgba(255,255,255,0.9)" style={{ marginTop: 6 }}>Small steps. Big impact. 🌱</AppText>
            </View>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
              <Recycle size={30} color="#FFFFFF" weight="fill" />
            </View>
          </View>
          <Pressable
            testID="hero-upload-button"
            onPress={() => router.push("/(tabs)/upload")}
            style={({ pressed }) => ({
              marginTop: SPACING.lg, backgroundColor: "#FFFFFF", borderRadius: RADIUS.pill,
              paddingVertical: 13, paddingHorizontal: SPACING.lg, flexDirection: "row",
              alignItems: "center", justifyContent: "center", gap: SPACING.sm, opacity: pressed ? 0.9 : 1,
            })}
          >
            <Camera size={20} color={colors.primaryDark} weight="fill" />
            <AppText weight="bold" size={15} color={colors.primaryDark}>Upload Waste Photo</AppText>
            <ArrowRight size={18} color={colors.primaryDark} weight="bold" />
          </Pressable>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: SPACING.md }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: i === 0 ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.5)" }} />
            ))}
          </View>
        </LinearGradient>

        {/* ---- Metric cards ---- */}
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <MetricCard testID="metric-total-recycled" tint={colors.primary} filled
            icon={<Recycle size={18} color="#FFFFFF" weight="fill" />}
            label="Total Recycled" value={formatKg(d.total_recycled_kg)} />
          <MetricCard testID="metric-wallet-balance" tint={colors.warning}
            icon={<WalletIcon size={18} color={colors.warning} weight="fill" />}
            label="Wallet Balance" value={formatINR(d.wallet_balance)} />
          <MetricCard testID="metric-co2-saved" tint={colors.success}
            icon={<Leaf size={18} color={colors.success} weight="fill" />}
            label="CO₂ Saved" value={formatKg(d.co2_saved_kg)} />
        </View>

        {/* ---- Monthly goal ---- */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText weight="bold" size={16}>Monthly Goal</AppText>
            <AppText weight="bold" color={colors.primary}>{d.monthly_progress_percent || 0}%</AppText>
          </View>
          <AppText size={12} color={colors.textSecondary} style={{ marginTop: 4 }}>
            Recycle {formatKg(d.monthly_goal_kg)} this month to unlock a bonus voucher.
          </AppText>
          <View style={{ height: 10, borderRadius: 6, backgroundColor: colors.secondary, marginTop: SPACING.md, overflow: "hidden" }}>
            <View style={{ width: `${d.monthly_progress_percent || 0}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 6 }} />
          </View>
          <AppText size={12} color={colors.textSecondary} style={{ marginTop: 6 }} testID="monthly-goal-values">
            {formatKg(d.monthly_recycled_kg)} / {formatKg(d.monthly_goal_kg)}
          </AppText>
        </Card>

        {/* ---- How it works ---- */}
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <AppText size={18} weight="bold">How it works</AppText>
            <Pressable testID="learn-more-button" onPress={() => router.push("/about")} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <AppText size={13} weight="semibold" color={colors.primary}>Learn more</AppText>
              <CaretRight size={14} color={colors.primary} weight="bold" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Step n={1} icon={<Camera size={22} color={colors.accent} weight="fill" />} title="AI Identify"
              desc="Our AI recognizes your waste type" onPress={() => router.push("/(tabs)/upload")} />
            <StepArrow />
            <Step n={2} icon={<CurrencyInr size={22} color={colors.primary} weight="bold" />} title="Estimate Value"
              desc="Get instant value estimate" onPress={() => router.push("/(tabs)/upload")} />
            <StepArrow />
            <Step n={3} icon={<Gift size={22} color={colors.warning} weight="fill" />} title="Earn Rewards"
              desc="Receive points in your wallet" onPress={() => router.push("/(tabs)/rewards")} />
          </View>
        </View>

        {/* ---- Find Recycler + Rewards ---- */}
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Pressable testID="find-recycler-card" style={{ flex: 1 }} onPress={() => router.push("/(tabs)/recycler")}>
            <Card style={{ flex: 1, backgroundColor: colors.surface }}>
              <MapPin size={26} color={colors.primary} weight="fill" />
              <AppText weight="bold" size={15} style={{ marginTop: SPACING.sm }}>Find Nearby Recycler</AppText>
              <AppText size={12} color={colors.textSecondary} style={{ marginTop: 4 }}>Locate verified recyclers near you</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: SPACING.md }}>
                <AppText size={13} weight="bold" color={colors.primary}>Schedule Pickup</AppText>
                <ArrowRight size={15} color={colors.primary} weight="bold" />
              </View>
            </Card>
          </Pressable>

          <Pressable testID="rewards-card" style={{ flex: 1 }} onPress={() => router.push("/(tabs)/rewards")}>
            <LinearGradient colors={colors.rewardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: RADIUS.lg, padding: SPACING.lg }}>
              <Leaf size={22} color="rgba(255,255,255,0.9)" weight="fill" />
              <AppText size={14} color="rgba(255,255,255,0.9)" style={{ marginTop: SPACING.sm }}>Your Rewards</AppText>
              <AppText size={26} weight="bold" color="#FFFFFF">{formatINR(d.wallet_balance)}</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.sm, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Recycle size={14} color="#FFFFFF" weight="fill" />
                <AppText size={12} weight="bold" color="#FFFFFF">{formatKg(d.total_recycled_kg)} recycled</AppText>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ---- Recent scans ---- */}
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <AppText size={18} weight="bold">Recent Scans</AppText>
            <Pressable testID="view-all-scans" onPress={() => router.push("/recent-scans")}>
              <AppText size={13} weight="semibold" color={colors.primary}>View All</AppText>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Card>
              <AppText color={colors.textSecondary} style={{ textAlign: "center", paddingVertical: SPACING.md }}>
                No scans yet. Scan your first recyclable item to start earning.
              </AppText>
            </Card>
          ) : (
            <Card style={{ padding: SPACING.sm, gap: 2 }}>
              {recent.map((s: any, i: number) => (
                <RecentRow key={s.id} scan={s} last={i === recent.length - 1} onPress={() => router.push({ pathname: "/scan-detail", params: { id: s.id } })} />
              ))}
            </Card>
          )}
        </View>

        {/* ---- Choose your theme ---- */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
            <PaintBrush size={20} color={colors.primary} weight="fill" />
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={15}>Choose Your Theme</AppText>
              <AppText size={12} color={colors.textSecondary}>Make it yours!</AppText>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.md }}>
            {THEME_NAMES.map((name) => {
              const selected = name === themeName;
              return (
                <Pressable
                  key={name}
                  testID={`theme-${name.toLowerCase()}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setTheme(name);
                  }}
                  style={{ alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 48, height: 48, borderRadius: 24, backgroundColor: THEME_SWATCH[name],
                      borderWidth: selected ? 3 : 1, borderColor: selected ? colors.primary : colors.border,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {name === "Green" && <Leaf size={22} color="#FFFFFF" weight="fill" />}
                    {name === "Blue" && <WalletIcon size={20} color="#FFFFFF" weight="fill" />}
                    {name === "Dark" && <PaintBrush size={20} color="#FFFFFF" weight="fill" />}
                    {name === "Pastel" && <Leaf size={22} color="#FFFFFF" weight="fill" />}
                  </View>
                  <AppText size={12} weight={selected ? "bold" : "regular"} color={selected ? colors.primary : colors.textSecondary}>{name}</AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, icon, tint, filled, testID }: any) {
  const { colors } = useAppTheme();
  const bg = filled ? tint : colors.card;
  const fg = filled ? "#FFFFFF" : colors.textPrimary;
  const sub = filled ? "rgba(255,255,255,0.9)" : colors.textSecondary;
  return (
    <View testID={testID} style={{
      flex: 1, backgroundColor: bg, borderRadius: RADIUS.lg, padding: SPACING.md,
      borderWidth: filled ? 0 : 1, borderColor: colors.border, minHeight: 96,
    }}>
      <View style={{
        width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
        backgroundColor: filled ? "rgba(255,255,255,0.22)" : colors.surface,
      }}>{icon}</View>
      <AppText size={18} weight="bold" color={fg} style={{ marginTop: SPACING.sm }} numberOfLines={1}>{value}</AppText>
      <AppText size={11} color={sub} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

function Step({ n, icon, title, desc, onPress }: any) {
  const { colors } = useAppTheme();
  return (
    <Pressable testID={`how-step-${n}`} onPress={onPress} style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}>
        {icon}
        <View style={{ position: "absolute", top: -4, left: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <AppText size={11} weight="bold" color={colors.onPrimary}>{n}</AppText>
        </View>
      </View>
      <AppText size={13} weight="bold" style={{ textAlign: "center" }}>{title}</AppText>
      <AppText size={10} color={colors.textSecondary} style={{ textAlign: "center" }}>{desc}</AppText>
    </Pressable>
  );
}

function StepArrow() {
  const { colors } = useAppTheme();
  return <View style={{ paddingTop: 20 }}><ArrowRight size={16} color={colors.muted} weight="bold" /></View>;
}

function RecentRow({ scan, last, onPress }: any) {
  const { colors } = useAppTheme();
  const item = scan.items?.[0] || {};
  const url = fileUrl(scan.image_url);
  return (
    <Pressable onPress={onPress} testID={`recent-${scan.id}`}
      style={{ flexDirection: "row", alignItems: "center", padding: SPACING.sm, gap: SPACING.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
      <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {url ? <Image source={{ uri: url }} style={{ width: 46, height: 46 }} contentFit="cover" /> : <Recycle size={22} color={colors.primary} weight="fill" />}
      </View>
      <View style={{ flex: 1 }}>
        <AppText weight="semibold" numberOfLines={1}>{item.name || "Waste"}</AppText>
        <AppText size={12} color={colors.textSecondary} numberOfLines={1}>
          {item.category} · {item.quantity || 1} item · {formatKg(scan.total_weight_kg)}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText weight="bold">{formatINR(scan.total_value_inr)}</AppText>
        <StatusBadge status={scan.status} />
      </View>
      <CaretRight size={16} color={colors.muted} />
    </Pressable>
  );
}
