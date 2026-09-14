import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Images, Info } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { RADIUS, SPACING } from "@/src/theme/palettes";
import { AppText, Card } from "@/src/ui/components";
import { useToast } from "@/src/ui/Toast";

export default function Upload() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();

  const goPreview = (asset: ImagePicker.ImagePickerAsset) => {
    const isPng = (asset.mimeType || "").includes("png") || (asset.fileName || "").toLowerCase().endsWith(".png");
    const type = isPng ? "image/png" : "image/jpeg";
    const name = asset.fileName || `waste.${isPng ? "png" : "jpg"}`;
    router.push({ pathname: "/preview", params: { uri: asset.uri, name, type } });
  };

  const ensure = async (kind: "camera" | "gallery") => {
    const get = kind === "camera" ? ImagePicker.getCameraPermissionsAsync : ImagePicker.getMediaLibraryPermissionsAsync;
    const req = kind === "camera" ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
    let perm = await get();
    if (perm.status !== "granted" && (perm.canAskAgain || perm.status === "undetermined")) {
      perm = await req();
    }
    if (perm.status !== "granted") {
      show(`${kind === "camera" ? "Camera" : "Photos"} permission needed. Opening settings...`, "error");
      setTimeout(() => Linking.openSettings().catch(() => {}), 900);
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    if (!(await ensure("camera"))) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) goPreview(res.assets[0]);
  };

  const pickGallery = async () => {
    if (!(await ensure("gallery"))) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) goPreview(res.assets[0]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: SPACING.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <AppText size={22} weight="bold">Scan Waste</AppText>
        <AppText size={13} color={colors.textSecondary}>Choose how you want to add a photo</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>
        <Pressable testID="take-photo-option" onPress={takePhoto}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.lg }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Camera size={32} color={colors.onPrimary} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText size={17} weight="bold">Take Photo</AppText>
              <AppText size={13} color={colors.textSecondary}>Use your camera to capture waste</AppText>
            </View>
          </Card>
        </Pressable>

        <Pressable testID="choose-gallery-option" onPress={pickGallery}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.lg }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Images size={32} color="#FFFFFF" weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText size={17} weight="bold">Choose from Gallery</AppText>
              <AppText size={13} color={colors.textSecondary}>Select from your device photos</AppText>
            </View>
          </Card>
        </Pressable>

        <View style={{ flexDirection: "row", gap: SPACING.sm, alignItems: "center", backgroundColor: colors.surface, borderRadius: RADIUS.md, padding: SPACING.md }}>
          <Info size={18} color={colors.muted} />
          <AppText size={12} color={colors.textSecondary} style={{ flex: 1 }}>
            Supported formats: JPG, JPEG and PNG only. Use a clear photo of a single recyclable item for best results.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
