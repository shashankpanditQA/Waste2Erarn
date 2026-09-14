import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { SPACING } from "@/src/theme/palettes";
import { AppText, Card, PrimaryButton } from "@/src/ui/components";
import { formatINR } from "@/src/utils/format";

export default function RewardCredited() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { total, commission, credit } = useLocalSearchParams<{ total: string; commission: string; credit: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + SPACING.xl, paddingHorizontal: SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.lg }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: colors.success + "22", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={72} color={colors.success} weight="fill" />
        </View>
        <AppText size={24} weight="bold">Reward Credited! 🎉</AppText>
        <AppText color={colors.textSecondary} style={{ textAlign: "center" }}>
          Your waste has been verified and the reward has been credited to your wallet.
        </AppText>

        <Card style={{ width: "100%", gap: SPACING.md }}>
          <Row label="Total Value" value={formatINR(Number(total))} colors={colors} />
          <Row label="Platform Commission (15%)" value={`- ${formatINR(Number(commission))}`} colors={colors} negative />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <Row label="Your Earning" value={formatINR(Number(credit))} colors={colors} bold />
        </Card>
      </View>

      <View style={{ gap: SPACING.sm }}>
        <PrimaryButton testID="view-wallet-button" title="View Wallet" onPress={() => router.replace("/(tabs)/rewards")} />
        <PrimaryButton testID="back-home-button" title="Back to Home" variant="ghost" onPress={() => router.replace("/(tabs)")} />
      </View>
    </View>
  );
}

function Row({ label, value, colors, bold, negative }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <AppText color={colors.textSecondary} size={bold ? 16 : 14} weight={bold ? "bold" : "regular"}>{label}</AppText>
      <AppText weight="bold" size={bold ? 20 : 15} color={negative ? colors.error : bold ? colors.success : colors.textPrimary}>{value}</AppText>
    </View>
  );
}
