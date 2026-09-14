import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, Clock, MapPin, Star } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, Loading, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";
import { formatINR } from "@/src/utils/format";

const TIMES = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];

function nextDays(n: number) {
  const out: { label: string; sub: string; value: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" }),
      sub: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: d.toISOString().slice(0, 10),
    });
  }
  return out;
}

export default function SchedulePickup() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { recyclerId, scanId } = useLocalSearchParams<{ recyclerId: string; scanId: string }>();

  const days = nextDays(4);
  const [date, setDate] = useState(days[0].value);
  const [time, setTime] = useState(TIMES[1]);

  const recyclers = useQuery({ queryKey: ["recyclers"], queryFn: () => api("/api/recyclers/nearby") });
  const scanQ = useQuery({ queryKey: ["scan", scanId], queryFn: () => api(`/api/scans/${scanId}`), enabled: !!scanId });
  const recycler = (recyclers.data?.recyclers || []).find((r: any) => r.id === recyclerId);
  const scan = scanQ.data?.scan;

  const confirm = useMutation({
    mutationFn: () => api("/api/pickups", { body: { recycler_id: recyclerId, scan_id: scanId, pickup_date: date, pickup_time: time } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["scans"] });
      qc.invalidateQueries({ queryKey: ["pickups"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      router.replace({ pathname: "/pickup-qr", params: { id: res.pickup.id } });
    },
    onError: (e: any) => show(e?.detail || "Could not schedule pickup.", "error"),
  });

  if (recyclers.isLoading || scanQ.isLoading) return <View style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Schedule Pickup" /><Loading /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Schedule Pickup" />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>
        {recycler ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <MapPin size={24} color={colors.primary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold" size={15}>{recycler.name}</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Star size={12} color={colors.warning} weight="fill" />
                <AppText size={12} color={colors.textSecondary}>{recycler.rating} · {recycler.distance_km} km</AppText>
              </View>
            </View>
            {scan ? <AppText weight="bold" color={colors.primary}>{formatINR(scan.total_value_inr)}</AppText> : null}
          </Card>
        ) : null}

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.sm }}>
            <CalendarBlank size={18} color={colors.primary} weight="fill" />
            <AppText weight="bold" size={15}>Select Date</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
            {days.map((d) => {
              const on = d.value === date;
              return (
                <Pressable key={d.value} testID={`date-${d.value}`} onPress={() => setDate(d.value)}
                  style={{ flexShrink: 0, width: 78, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: "center", backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
                  <AppText weight="bold" color={on ? colors.onPrimary : colors.textPrimary}>{d.label}</AppText>
                  <AppText size={12} color={on ? colors.onPrimary : colors.textSecondary}>{d.sub}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.sm }}>
            <Clock size={18} color={colors.primary} weight="fill" />
            <AppText weight="bold" size={15}>Select Time Slot</AppText>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {TIMES.map((t) => {
              const on = t === time;
              return (
                <Pressable key={t} testID={`time-${t}`} onPress={() => setTime(t)}
                  style={{ borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: SPACING.lg, backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
                  <AppText weight="semibold" color={on ? colors.onPrimary : colors.textPrimary}>{t}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={{ padding: SPACING.lg, paddingBottom: insets.bottom + SPACING.sm, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <PrimaryButton testID="confirm-pickup-button" title="Confirm Pickup" loading={confirm.isPending} onPress={() => confirm.mutate()} />
      </View>
    </View>
  );
}
