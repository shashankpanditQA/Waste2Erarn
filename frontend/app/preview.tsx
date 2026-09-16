import { View } from "react-native";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkle } from "phosphor-react-native";

import { api, buildImageForm } from "@/src/api/client";
import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, PrimaryButton, ScreenHeader } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";

export default function Preview() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { uri, source } = useLocalSearchParams<{ uri: string; name: string; type: string; source?: string }>();

  const analyze = useMutation({
    mutationFn: async () => {
      // Gallery images are resized/compressed for speed. Camera images skip this
      // step because the manipulator can emit a broken/empty file for some
      // device camera captures (blank preview + failed analyze); the camera
      // capture is already JPEG-compressed at source and the backend has a
      // per-provider timeout + fallback to handle larger payloads.
      let sendUri = uri!;
      if (source !== "camera") {
        try {
          const m = await ImageManipulator.manipulateAsync(
            uri!,
            [{ resize: { width: 1024 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
          );
          if (m?.uri) sendUri = m.uri;
        } catch {
          // fall back to the original image if manipulation is unavailable
        }
      }
      const form = await buildImageForm(sendUri, "waste.jpg", "image/jpeg");
      return api("/api/scans/analyze", { form });
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["scans"] });
      if (res.ok && res.scan) {
        router.replace({ pathname: "/result", params: { id: res.scan.id } });
      } else {
        show(res.message || "Could not analyze image.", "error");
      }
    },
    onError: (e: any) => show(e?.detail || "Analysis failed. Try again.", "error"),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Preview" />
      <View style={{ flex: 1, padding: SPACING.lg, gap: SPACING.lg }}>
        <View style={{ flex: 1, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" /> : null}
        </View>
        <AppText size={13} color={colors.textSecondary} style={{ textAlign: "center" }}>
          Make sure the item is clearly visible before analyzing.
        </AppText>
        <View style={{ paddingBottom: insets.bottom + SPACING.sm, gap: SPACING.sm }}>
          <PrimaryButton
            testID="analyze-button"
            title={analyze.isPending ? "Analyzing waste..." : "Analyze"}
            loading={analyze.isPending}
            onPress={() => analyze.mutate()}
            icon={<Sparkle size={20} color={colors.onPrimary} weight="fill" />}
          />
          <PrimaryButton testID="retake-button" title="Retake" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
