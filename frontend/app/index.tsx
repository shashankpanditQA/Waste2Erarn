import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Recycle } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";
import { AppText } from "@/src/ui/components";

export default function Index() {
  const { colors } = useAppTheme();
  return (
    <LinearGradient colors={colors.heroGradient} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 96, height: 96, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}
      >
        <Recycle size={54} color="#FFFFFF" weight="fill" />
      </View>
      <AppText size={30} weight="bold" color="#FFFFFF">Waste2Earn</AppText>
      <AppText size={15} color="rgba(255,255,255,0.9)" style={{ marginTop: 8 }}>
        Recycle Today · Earn Tomorrow
      </AppText>
    </LinearGradient>
  );
}
