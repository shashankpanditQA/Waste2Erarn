import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, MapPin, QrCode, Wallet as WalletIcon } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, EmptyState, Loading, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { formatINR, timeAgo } from "@/src/utils/format";

export default function RecyclerDemo() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const q = useQuery({ queryKey: ["recycler-demo"], queryFn: () => api("/api/recycler-demo") });

  if (q.isLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Recycler Demo View" /><Loading /></View>;

  const { recycler, scheduled_pickups = [], verified_pickups = [], ledger = [] } = q.data || {};
  const totalCommission = ledger.reduce((s: number, l: any) => s + (l.commission_inr || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Recycler Demo View" />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
        <Card style={{ backgroundColor: colors.surface, gap: SPACING.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <MapPin size={24} color={colors.onPrimary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={16}>{recycler?.name}</AppText>
              <AppText size={12} color={colors.textSecondary}>{recycler?.service_area} · {recycler?.availability}</AppText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING.md, marginTop: SPACING.sm }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <WalletIcon size={18} color={colors.primary} weight="fill" />
              <View>
                <AppText size={11} color={colors.textSecondary}>Mock Balance</AppText>
                <AppText weight="bold">{formatINR(recycler?.mock_wallet_balance)}</AppText>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <AppText size={11} color={colors.textSecondary}>Paid to Platform</AppText>
              <AppText weight="bold">{formatINR(totalCommission)}</AppText>
            </View>
          </View>
        </Card>

        <AppText size={16} weight="bold">Scheduled Pickups</AppText>
        {scheduled_pickups.length === 0 ? (
          <Card><EmptyState title="No pending pickups" subtitle="Schedule a pickup to verify it here." /></Card>
        ) : scheduled_pickups.map((p: any) => (
          <Card key={p.id} style={{ gap: SPACING.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText weight="bold">Pickup {p.qr_short}</AppText>
              <AppText weight="bold" color={colors.primary}>{formatINR(p.total_value_inr)}</AppText>
            </View>
            <AppText size={12} color={colors.textSecondary}>{p.pickup_date} · {p.pickup_time}</AppText>
            <PrimaryButton testID={`demo-verify-${p.id}`} title="Scan / Verify Pickup" onPress={() => router.push({ pathname: "/verify", params: { id: p.id } })} icon={<QrCode size={20} color={colors.onPrimary} weight="fill" />} />
          </Card>
        ))}

        {verified_pickups.length > 0 ? (
          <>
            <AppText size={16} weight="bold">Verified Pickups</AppText>
            {verified_pickups.map((p: any) => (
              <Card key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                <CheckCircle size={26} color={colors.success} weight="fill" />
                <View style={{ flex: 1 }}>
                  <AppText weight="bold">Pickup {p.qr_short}</AppText>
                  <AppText size={12} color={colors.textSecondary}>{p.pickup_date} · {p.pickup_time}</AppText>
                </View>
                <AppText weight="bold" color={colors.success}>{formatINR(p.total_value_inr)}</AppText>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
