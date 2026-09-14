import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Recycle } from "phosphor-react-native";

import { api, fileUrl } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, EmptyState, Loading, PrimaryButton, ScreenHeader, StatusBadge } from "@/src/ui/components";
import { formatINR, formatKg, timeAgo } from "@/src/utils/format";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Analyzed", value: "analyzed" },
  { label: "Pending", value: "pending" },
  { label: "Pickup", value: "pickup_scheduled" },
  { label: "Verified", value: "verified" },
  { label: "Credited", value: "credited" },
];

export default function RecentScans() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const q = useQuery({ queryKey: ["scans"], queryFn: () => api("/api/scans") });

  const all = q.data?.scans || [];
  const scans = filter === "all" ? all : all.filter((s: any) => s.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Recent Scans" />
      <View style={{ height: 56, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.value}
          contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.lg, alignItems: "center" }}
          renderItem={({ item }) => {
            const on = item.value === filter;
            return (
              <Pressable testID={`filter-${item.value}`} onPress={() => setFilter(item.value)}
                style={{ flexShrink: 0, height: 36, justifyContent: "center", paddingHorizontal: SPACING.lg, borderRadius: RADIUS.pill, backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
                <AppText size={13} weight="semibold" color={on ? colors.onPrimary : colors.textSecondary}>{item.label}</AppText>
              </Pressable>
            );
          }}
        />
      </View>

      {q.isLoading ? <Loading /> : scans.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon={<View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><MagnifyingGlass size={44} color={colors.primary} weight="fill" /></View>}
            title="No scans yet"
            subtitle="Scan your first recyclable item to start earning rewards."
            action={<PrimaryButton testID="empty-scan-cta" title="Scan Waste" onPress={() => router.replace("/(tabs)/upload")} style={{ marginTop: SPACING.md }} />}
          />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingTop: SPACING.md }}
          renderItem={({ item }) => {
            const it = item.items?.[0] || {};
            const url = fileUrl(item.image_url);
            return (
              <Pressable testID={`scan-${item.id}`} onPress={() => router.push({ pathname: "/scan-detail", params: { id: item.id } })}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                  <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                    {url ? <Image source={{ uri: url }} style={{ width: 52, height: 52 }} contentFit="cover" /> : <Recycle size={26} color={colors.primary} weight="fill" />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText weight="bold" numberOfLines={1}>{it.name || "Waste"}</AppText>
                    <AppText size={12} color={colors.textSecondary}>{it.category} · {formatKg(item.total_weight_kg)} · {timeAgo(item.created_at)}</AppText>
                    <StatusBadge status={item.status} />
                  </View>
                  <AppText weight="bold" color={colors.primary}>{formatINR(item.total_value_inr)}</AppText>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
