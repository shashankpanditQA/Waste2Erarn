import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Gift, MapPin, Recycle, Sparkle } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, EmptyState, Loading, ScreenHeader } from "@/src/ui/components";
import { formatINR, timeAgo } from "@/src/utils/format";

export default function Activity() {
  const { colors } = useAppTheme();
  const q = useQuery({ queryKey: ["activity"], queryFn: () => api("/api/activity") });
  const items = q.data?.activities || [];

  const iconFor = (icon: string) => {
    if (icon === "reward") return <Gift size={20} color={colors.warning} weight="fill" />;
    if (icon === "pickup") return <MapPin size={20} color={colors.accent} weight="fill" />;
    return <Sparkle size={20} color={colors.primary} weight="fill" />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Activity" />
      {q.isLoading ? <Loading /> : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon={<Recycle size={50} color={colors.primary} weight="fill" />} title="No activity yet" subtitle="Your recycling activity will appear here." />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                {iconFor(item.icon)}
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="bold">{item.title}</AppText>
                <AppText size={12} color={colors.textSecondary}>{item.subtitle}</AppText>
                <AppText size={11} color={colors.muted} style={{ marginTop: 2 }}>{timeAgo(item.created_at)}</AppText>
              </View>
              {item.amount_inr != null ? (
                <AppText weight="bold" color={item.title.includes("Credited") ? colors.success : colors.primary}>{formatINR(item.amount_inr)}</AppText>
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}
