import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, NavigationArrow, Star } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, Loading, PrimaryButton } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";

export default function Recycler() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();

  const q = useQuery({ queryKey: ["recyclers"], queryFn: () => api("/api/recyclers/nearby") });
  const scans = useQuery({ queryKey: ["scans"], queryFn: () => api("/api/scans") });

  const resolveScanId = (): string | null => {
    if (scanId) return scanId;
    const list = scans.data?.scans || [];
    const eligible = list.find((s: any) => ["analyzed", "pending"].includes(s.status));
    return eligible?.id || null;
  };

  const onSchedule = (recyclerId: string) => {
    const sid = resolveScanId();
    if (!sid) {
      show("Scan and analyze a recyclable item first.", "error");
      return;
    }
    router.push({ pathname: "/schedule-pickup", params: { recyclerId, scanId: sid } });
  };

  const recyclers = q.data?.recyclers || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: SPACING.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <AppText size={22} weight="bold">Find Recycler</AppText>
        <AppText size={13} color={colors.textSecondary}>Verified recyclers near you</AppText>
      </View>

      {q.isLoading ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl }}>
          {/* Stylized map visual (no external map API) */}
          <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 150, borderRadius: RADIUS.lg, overflow: "hidden", padding: SPACING.md }}>
            {[{ t: 20, l: 40 }, { t: 60, l: 160 }, { t: 90, l: 90 }, { t: 40, l: 250 }].map((p, i) => (
              <View key={i} style={{ position: "absolute", top: p.t, left: p.l, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, padding: 5 }}>
                <MapPin size={16} color={colors.primaryDark} weight="fill" />
              </View>
            ))}
            <View style={{ position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
              <NavigationArrow size={14} color="#FFFFFF" weight="fill" />
              <AppText size={12} color="#FFFFFF" weight="semibold">{recyclers.length} recyclers nearby</AppText>
            </View>
          </LinearGradient>

          {recyclers.map((r: any) => (
            <Card key={r.id} testID={`recycler-${r.id}`} style={{ gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={24} color={colors.primary} weight="fill" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" size={15}>{r.name}</AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Star size={13} color={colors.warning} weight="fill" />
                      <AppText size={12} color={colors.textSecondary}>{r.rating} ({r.reviews})</AppText>
                    </View>
                    <AppText size={12} color={colors.textSecondary}>· {r.distance_km} km · {r.eta_min} min</AppText>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {r.supported.map((s: string) => (
                  <View key={s} style={{ backgroundColor: colors.surface, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <AppText size={11} color={colors.textSecondary}>{s}</AppText>
                  </View>
                ))}
              </View>
              <PrimaryButton testID={`schedule-${r.id}`} title="Schedule Pickup" onPress={() => onSchedule(r.id)} />
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
