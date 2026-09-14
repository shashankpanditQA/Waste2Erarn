import { Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DownloadSimple, QrCode } from "phosphor-react-native";

import { api } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card, Loading, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";

export default function PickupQR() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({ queryKey: ["pickup", id], queryFn: () => api(`/api/pickups/${id}`), enabled: !!id });
  const pickup = q.data?.pickup;

  if (q.isLoading || !pickup) return <View style={{ flex: 1, backgroundColor: colors.background }}><ScreenHeader title="Pickup QR Code" /><Loading label="Generating QR code..." /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Pickup QR Code" />
      <View style={{ flex: 1, padding: SPACING.lg, alignItems: "center", gap: SPACING.lg }}>
        <Card style={{ alignItems: "center", padding: SPACING.xl, gap: SPACING.md, marginTop: SPACING.md }}>
          <View style={{ backgroundColor: "#FFFFFF", padding: SPACING.md, borderRadius: RADIUS.md }}>
            <QRCode value={pickup.qr_code_payload} size={210} backgroundColor="#FFFFFF" color="#000000" />
          </View>
          <AppText size={12} color={colors.textSecondary}>Pickup ID</AppText>
          <AppText size={22} weight="bold" testID="pickup-short-id">{pickup.qr_short}</AppText>
          <AppText size={13} color={colors.textSecondary} style={{ textAlign: "center" }}>
            Show this QR code to the recycler at the time of pickup.
          </AppText>
        </Card>

        <View style={{ width: "100%", gap: SPACING.sm, marginTop: "auto", paddingBottom: insets.bottom + SPACING.sm }}>
          <PrimaryButton testID="verify-pickup-nav" title="Verify Pickup" onPress={() => router.push({ pathname: "/verify", params: { id } })} icon={<QrCode size={20} color={colors.onPrimary} weight="fill" />} />
          <PrimaryButton
            testID="download-qr-button"
            title="Share QR"
            variant="outline"
            icon={<DownloadSimple size={20} color={colors.primary} weight="bold" />}
            onPress={() => Share.share({ message: `Waste2Earn Pickup ${pickup.qr_short}: ${pickup.qr_code_payload}` }).catch(() => show("Unable to share", "error"))}
          />
        </View>
      </View>
    </View>
  );
}
