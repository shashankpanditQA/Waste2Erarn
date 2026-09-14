import { RefreshControl, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ClockCountdown, Wallet as WalletIcon } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, EmptyState, Loading } from "@/src/ui/components";
import { formatINR, timeAgo } from "@/src/utils/format";

export default function Rewards() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => api("/api/wallet") });
  const w = q.data || {};
  const txns = w.transactions || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: SPACING.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <AppText size={22} weight="bold">Wallet</AppText>
        <AppText testID="activity-link" onPress={() => router.push("/activity")} size={13} weight="semibold" color={colors.primary}>Activity</AppText>
      </View>

      {q.isLoading ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={q.refetch} tintColor={colors.primary} />}>
          <LinearGradient colors={colors.rewardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: RADIUS.lg, padding: SPACING.xl }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText color="rgba(255,255,255,0.9)">Current Balance</AppText>
              <WalletIcon size={24} color="#FFFFFF" weight="fill" />
            </View>
            <AppText size={38} weight="bold" color="#FFFFFF" testID="wallet-balance">{formatINR(w.balance)}</AppText>
          </LinearGradient>

          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Card style={{ flex: 1, backgroundColor: colors.surface }}>
              <ClockCountdown size={22} color={colors.warning} weight="fill" />
              <AppText size={12} color={colors.textSecondary} style={{ marginTop: 6 }}>Pending Rewards</AppText>
              <AppText size={18} weight="bold" testID="wallet-pending">{formatINR(w.pending)}</AppText>
            </Card>
            <Card style={{ flex: 1, backgroundColor: colors.surface }}>
              <ArrowUp size={22} color={colors.success} weight="bold" />
              <AppText size={12} color={colors.textSecondary} style={{ marginTop: 6 }}>Total Earned</AppText>
              <AppText size={18} weight="bold">{formatINR(w.total_earned)}</AppText>
            </Card>
          </View>

          <AppText size={16} weight="bold">Recent Transactions</AppText>
          {txns.length === 0 ? (
            <Card><EmptyState title="No transactions yet" subtitle="Start recycling to earn rewards." /></Card>
          ) : (
            <Card style={{ gap: 2, padding: SPACING.sm }}>
              {txns.map((t: any, i: number) => {
                const isCredit = t.direction === "credit";
                const isDebit = t.direction === "debit";
                const color = isCredit ? colors.success : isDebit ? colors.error : colors.warning;
                const sign = isCredit ? "+ " : isDebit ? "- " : "";
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.sm, borderBottomWidth: i === txns.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
                      {isDebit ? <ArrowDown size={18} color={color} weight="bold" /> : <ArrowUp size={18} color={color} weight="bold" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText weight="semibold">{t.label}</AppText>
                      <AppText size={12} color={colors.textSecondary}>{timeAgo(t.created_at)}</AppText>
                    </View>
                    <AppText weight="bold" color={color}>{sign}{formatINR(t.amount_inr)}</AppText>
                  </View>
                );
              })}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}
