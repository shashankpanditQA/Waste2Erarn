import { useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { QrCode } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";

export default function Verify() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const [busy, setBusy] = useState(false);

  const verify = useMutation({
    mutationFn: (body: any) => api(`/api/pickups/${id}/verify`, { body }),
    onSuccess: (res: any) => {
      setBusy(false);
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        ["dashboard", "wallet", "scans", "activity", "pickups", "notifications"].forEach((k) =>
          qc.invalidateQueries({ queryKey: [k] }));
        router.replace({ pathname: "/reward-credited", params: {
          total: String(res.total_value_inr), commission: String(res.commission_inr), credit: String(res.user_credit_inr),
        } });
      } else {
        scanned.current = false;
        show(res.message || "Verification failed.", "error");
      }
    },
    onError: (e: any) => { setBusy(false); scanned.current = false; show(e?.detail || "Verification failed.", "error"); },
  });

  const onScan = (data: string) => {
    if (scanned.current) return;
    scanned.current = true;
    setBusy(true);
    verify.mutate({ qr_payload: data });
  };

  const simulate = () => {
    if (busy) return;
    setBusy(true);
    verify.mutate({ simulate: true });
  };

  const canScan = permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ backgroundColor: colors.background }}><ScreenHeader title="Verify Pickup" /></View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {canScan ? (
          <CameraView
            style={{ ...StyleSheetAbsolute }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onScan(data)}
          />
        ) : null}

        {/* viewfinder frame */}
        <View style={{ width: 240, height: 240, borderRadius: RADIUS.lg, borderWidth: 3, borderColor: colors.primary }} />
        <AppText color="#FFFFFF" style={{ marginTop: SPACING.lg, textAlign: "center" }}>
          {canScan ? "Scan the QR code from recycler" : "Camera preview appears here on device"}
        </AppText>

        {!canScan ? (
          <Pressable
            testID="grant-camera-button"
            onPress={async () => {
              const r = await requestPermission();
              if (!r.granted && !r.canAskAgain) Linking.openSettings().catch(() => {});
            }}
            style={{ marginTop: SPACING.md, backgroundColor: colors.primary, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.xl, paddingVertical: 12 }}
          >
            <AppText weight="bold" color={colors.onPrimary}>Enable Camera</AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: SPACING.lg, paddingBottom: insets.bottom + SPACING.md, backgroundColor: colors.background, gap: SPACING.sm }}>
        <AppText size={12} color={colors.textSecondary} style={{ textAlign: "center" }}>
          Or click below to simulate the recycler scan (demo).
        </AppText>
        <PrimaryButton testID="simulate-scan-button" title="Simulate Recycler Scan" loading={busy} onPress={simulate} icon={<QrCode size={20} color={colors.onPrimary} weight="fill" />} />
      </View>
    </View>
  );
}

const StyleSheetAbsolute = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
