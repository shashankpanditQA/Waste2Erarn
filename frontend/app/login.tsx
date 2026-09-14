import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleLogo, Leaf, Recycle } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/auth/AuthContext";
import { SPACING } from "@/src/theme/palettes";
import { AppText, PrimaryButton } from "@/src/ui/components";

export default function Login() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { login, signingIn } = useAuth();

  return (
    <LinearGradient colors={colors.heroGradient} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: SPACING.xl, alignItems: "center" }}>
        <View
          style={{
            width: 92, height: 92, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center", marginBottom: 18,
          }}
        >
          <Recycle size={50} color="#FFFFFF" weight="fill" />
        </View>
        <AppText size={34} weight="bold" color="#FFFFFF">Waste2Earn</AppText>
        <AppText size={16} color="rgba(255,255,255,0.9)" style={{ marginTop: 10, textAlign: "center" }}>
          Turn Your Waste into Rewards
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Leaf size={16} color="rgba(255,255,255,0.9)" weight="fill" />
          <AppText size={13} color="rgba(255,255,255,0.85)">Recycle Today · A Cleaner Tomorrow</AppText>
        </View>
      </View>

      <View
        style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING["2xl"],
          paddingBottom: insets.bottom + SPACING.xl,
          gap: SPACING.md,
        }}
      >
        <AppText size={22} weight="bold">Welcome</AppText>
        <AppText color={colors.textSecondary} style={{ marginBottom: SPACING.sm }}>
          Sign in to start scanning waste and earning rewards.
        </AppText>
        <PrimaryButton
          testID="google-login-button"
          title={signingIn ? "Signing in..." : "Continue with Google"}
          loading={signingIn}
          onPress={login}
          icon={<GoogleLogo size={20} color={colors.onPrimary} weight="bold" />}
        />
        <AppText size={12} color={colors.muted} style={{ textAlign: "center", marginTop: SPACING.sm }}>
          Secure sign-in powered by Emergent
        </AppText>
      </View>
    </LinearGradient>
  );
}
