import { ScrollView, View } from "react-native";
import { Camera, CurrencyInr, Gift, Leaf, Recycle } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, ScreenHeader } from "@/src/ui/components";

const AUDIENCE = [
  "Households & Families", "Students & Colleges", "Offices & Corporate Campuses",
  "Apartments & Housing Societies", "Shops & Small Businesses", "Scrap Collectors & Recyclers",
  "Municipal Corporations / Smart Cities", "Environment-conscious individuals",
];

const STEPS = [
  { icon: Camera, title: "AI Identify", desc: "Our AI recognizes your waste type from a photo." },
  { icon: CurrencyInr, title: "Estimate Value", desc: "Get an instant, deterministic value estimate." },
  { icon: Gift, title: "Earn Rewards", desc: "Rewards are credited after pickup verification." },
];

export default function About() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="About / Impact" />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
        <Card style={{ alignItems: "center", gap: SPACING.sm }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Recycle size={34} color={colors.onPrimary} weight="fill" />
          </View>
          <AppText size={22} weight="bold">Waste2Earn</AppText>
          <AppText color={colors.textSecondary}>Recycle Today · A Cleaner Tomorrow</AppText>
        </Card>

        <AppText size={16} weight="bold">How it works</AppText>
        {STEPS.map((s, i) => (
          <Card key={i} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <s.icon size={22} color={colors.primary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold">{i + 1}. {s.title}</AppText>
              <AppText size={13} color={colors.textSecondary}>{s.desc}</AppText>
            </View>
          </Card>
        ))}

        <Card style={{ gap: SPACING.sm }}>
          <AppText size={16} weight="bold">Core Benefits</AppText>
          {["Encourages recycling", "Reduces waste", "Rewards users", "Helps recyclers", "Eco-friendly and scalable"].map((b) => (
            <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Leaf size={16} color={colors.success} weight="fill" />
              <AppText color={colors.textSecondary}>{b}</AppText>
            </View>
          ))}
        </Card>

        <Card style={{ gap: SPACING.sm }}>
          <AppText size={16} weight="bold">Who this is for</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {AUDIENCE.map((a) => (
              <View key={a} style={{ backgroundColor: colors.surface, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <AppText size={12} color={colors.textSecondary}>{a}</AppText>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
