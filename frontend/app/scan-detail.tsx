import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Recycle } from "phosphor-react-native";

import { api, fileUrl } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { SPACING } from "@/src/theme/palettes";
import { AppText, Card, Loading, PrimaryButton, ScreenHeader, StatusBadge } from "@/src/ui/components";
import { formatINR, formatKg } from "@/src/utils/format";

const STEPS = ["analyzed", "pending", "pickup_scheduled", "verified", "credited"];
const STEP_LABELS: Record<string, string> = {
  analyzed: "Analyzed", pending: "Reward Pending", pickup_scheduled: "Pickup Scheduled",
  verified: "Pickup Verified", credited: "Reward Credited",
};

export default function ScanDetail() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ["scan", id], queryFn: () => api(`/api/scans/${id}`), enabled: !!id });

  if (q.isLoading || !q.data?.scan) return <View style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Scan Details" /><Loading /></View>;

  const { scan, pickup } = q.data;
  const url = fileUrl(scan.image_url);
  const unsupported = scan.status === "unsupported";
  const currentIdx = STEPS.indexOf(scan.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Scan Details" />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
        <Card style={{ flexDirection: "row", gap: SPACING.lg, alignItems: "center" }}>
          <View style={{ width: 76, height: 76, borderRadius: 16, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {url ? <Image source={{ uri: url }} style={{ width: 76, height: 76 }} contentFit="cover" /> : <Recycle size={36} color={colors.primary} weight="fill" />}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText weight="bold" size={17}>{scan.items?.[0]?.name}</AppText>
            <StatusBadge status={scan.status} />
          </View>
        </Card>

        <Card style={{ gap: SPACING.sm }}>
          {scan.items?.map((it: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: i === scan.items.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
              <View>
                <AppText weight="semibold">{it.name}</AppText>
                <AppText size={12} color={colors.textSecondary}>{it.category} · Qty {it.quantity} · {formatKg(it.estimated_weight_kg)}</AppText>
              </View>
              <AppText weight="bold" color={colors.primary}>{formatINR(it.value_inr)}</AppText>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <AppText weight="bold">Total Value</AppText>
            <AppText weight="bold" color={colors.primary}>{formatINR(scan.total_value_inr)}</AppText>
          </View>
        </Card>

        {!unsupported ? (
          <Card style={{ gap: SPACING.md }}>
            <AppText weight="bold" size={15}>Progress</AppText>
            {STEPS.map((st, i) => {
              const done = i <= currentIdx;
              return (
                <View key={st} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                  {done ? (
                    <CheckCircle size={22} color={colors.success} weight="fill" />
                  ) : (
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.muted }} />
                  )}
                  <AppText color={done ? colors.textPrimary : colors.muted} weight={i === currentIdx ? "bold" : "regular"}>{STEP_LABELS[st]}</AppText>
                </View>
              );
            })}
          </Card>
        ) : (
          <Card style={{ backgroundColor: colors.error + "18" }}>
            <AppText color={colors.error} weight="semibold">This item is not supported for recycling. No reward was created.</AppText>
          </Card>
        )}

        <View style={{ paddingBottom: insets.bottom, gap: SPACING.sm }}>
          {["analyzed", "pending"].includes(scan.status) ? (
            <PrimaryButton testID="detail-schedule-button" title="Schedule Pickup" onPress={() => router.push({ pathname: "/(tabs)/recycler", params: { scanId: scan.id } })} />
          ) : null}
          {scan.status === "pickup_scheduled" && pickup ? (
            <PrimaryButton testID="detail-qr-button" title="View Pickup QR" onPress={() => router.push({ pathname: "/pickup-qr", params: { id: pickup.id } })} />
          ) : null}
          {scan.status === "credited" ? (
            <PrimaryButton testID="detail-wallet-button" title="View Wallet" onPress={() => router.push("/(tabs)/rewards")} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
