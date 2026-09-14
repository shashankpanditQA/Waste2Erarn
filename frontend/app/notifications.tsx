import { useEffect } from "react";
import { FlatList, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellSimple } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, EmptyState, Loading, ScreenHeader } from "@/src/ui/components";
import { timeAgo } from "@/src/utils/format";

export default function Notifications() {
  const { colors } = useAppTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api("/api/notifications") });
  const markAll = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if ((q.data?.unread || 0) > 0) markAll.mutate();
  }, [q.data?.unread]);

  const items = q.data?.notifications || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Notifications" />
      {q.isLoading ? <Loading /> : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon={<BellSimple size={50} color={colors.primary} weight="fill" />} title="No notifications" subtitle="You're all caught up." />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: "row", gap: SPACING.md, opacity: item.read ? 0.7 : 1 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                <BellSimple size={20} color={colors.primary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="bold">{item.title}</AppText>
                <AppText size={13} color={colors.textSecondary}>{item.message}</AppText>
                <AppText size={11} color={colors.muted} style={{ marginTop: 2 }}>{timeAgo(item.created_at)}</AppText>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
