import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Gift, House, MapPin, UploadSimple, User } from "phosphor-react-native";

import { useAppTheme } from "@/src/theme/ThemeContext";

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navSelected,
        tabBarInactiveTintColor: colors.navUnselected,
        tabBarStyle: {
          backgroundColor: colors.navBar,
          borderTopColor: colors.divider,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <House size={26} color={color} weight={focused ? "fill" : "regular"} /> }} />
      <Tabs.Screen name="upload" options={{ title: "Upload", tabBarIcon: ({ color, focused }) => <UploadSimple size={26} color={color} weight={focused ? "fill" : "regular"} /> }} />
      <Tabs.Screen name="rewards" options={{ title: "Rewards", tabBarIcon: ({ color, focused }) => <Gift size={26} color={color} weight={focused ? "fill" : "regular"} /> }} />
      <Tabs.Screen name="recycler" options={{ title: "Recycler", tabBarIcon: ({ color, focused }) => <MapPin size={26} color={color} weight={focused ? "fill" : "regular"} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, focused }) => <User size={26} color={color} weight={focused ? "fill" : "regular"} /> }} />
    </Tabs>
  );
}
