import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Gift, MapPin, Recycle } from "phosphor-react-native";

import { api, fileUrl } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, Loading, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";
import { formatINR, formatKg } from "@/src/utils/format";

export default function Result() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({ queryKey: ["scan", id], queryFn: () => api(`/api/scans/${id}`), enabled: !!id });
  const scan = q.data?.scan;
  const reward = q.data?.reward;

  const addReward = useMutation({
    mutationFn: () => api(`/api/scans/${id}/add-reward`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scan", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      show("Reward added as Pending. Schedule a pickup to get credited.", "success");
    },
    onError: (e: any) => show(e?.detail || "Could not add reward.", "error"),
  });

  if (q.isLoading || !scan) return <View style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Analysis Result" /><Loading /></View>;

  const url = fileUrl(scan.image_url);
  const hasReward = !!reward;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Analysis Result" />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <AppText size={20} weight="bold">Waste Analysis Complete ♻️</AppText>
        </View>

        <Card style={{ flexDirection: "row", gap: SPACING.lg, alignItems: "center" }}>
          <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {url ? <Image source={{ uri: url }} style={{ width: 84, height: 84 }} contentFit="cover" /> : <Recycle size={40} color={colors.primary} weight="fill" />}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.success + "22", alignSelf: "flex-start", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <CheckCircle size={14} color={colors.success} weight="fill" />
              <AppText size={12} weight="bold" color={colors.success}>Recyclable</AppText>
            </View>
            <AppText weight="bold" size={16}>{scan.items?.[0]?.name}</AppText>
            <AppText size={13} color={colors.textSecondary}>Confidence: {Math.round((scan.confidence || 0) * 100)}%</AppText>
          </View>
        </Card>

        {/* Detected items (segregation) */}
        <Card style={{ gap: SPACING.sm }}>
          <AppText weight="bold" size={15}>Detected Items</AppText>
          {scan.items?.map((it: any, i: number) => (
            <View key={i} style={{ gap: 6, paddingVertical: SPACING.sm, borderBottomWidth: i === scan.items.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText weight="semibold">{it.name}</AppText>
                <AppText weight="bold" color={colors.primary}>{formatINR(it.value_inr)}</AppText>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText size={12} color={colors.textSecondary}>{it.category} · Qty {it.quantity}</AppText>
                <AppText size={12} color={colors.textSecondary}>{formatKg(it.estimated_weight_kg)} · ₹{it.rate_per_kg}/kg</AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Reward */}
        <Card style={{ backgroundColor: colors.surface, gap: SPACING.sm }}>
          <Row label="Estimated Weight" value={formatKg(scan.total_weight_kg)} colors={colors} />
          <Row label="Estimated Value" value={formatINR(scan.total_value_inr)} colors={colors} bold />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Gift size={16} color={colors.warning} weight="fill" />
            <AppText size={12} color={colors.textSecondary}>
              {hasReward ? "Pending — credited after pickup verification" : "Add to rewards, then schedule a pickup to get credited"}
            </AppText>
          </View>
        </Card>

        <View style={{ gap: SPACING.sm, paddingBottom: insets.bottom }}>
          {!hasReward ? (
            <PrimaryButton testID="add-reward-button" title="Add to Wallet (Pending)" loading={addReward.isPending} onPress={() => addReward.mutate()} icon={<Gift size={20} color={colors.onPrimary} weight="fill" />} />
          ) : null}
          <PrimaryButton testID="schedule-pickup-button" title="Schedule Pickup" variant={hasReward ? "primary" : "outline"}
            onPress={() => router.push({ pathname: "/(tabs)/recycler", params: { scanId: scan.id } })}
            icon={<MapPin size={20} color={hasReward ? colors.onPrimary : colors.primary} weight="fill" />} />
          <PrimaryButton testID="scan-again-button" title="Scan Again" variant="ghost" onPress={() => router.replace("/(tabs)/upload")} />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, colors, bold }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <AppText color={colors.textSecondary}>{label}</AppText>
      <AppText weight={bold ? "bold" : "semibold"} size={bold ? 16 : 14}>{value}</AppText>
    </View>
  );
}
