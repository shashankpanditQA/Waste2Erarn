import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { ThemeProvider, useAppTheme } from "@/src/theme/ThemeContext";
import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { ToastProvider } from "@/src/ui/Toast";
import { Loading } from "@/src/ui/components";

LogBox.ignoreAllLogs(true);

function AuthGate() {
  const { user, loading, loginWithToken } = useAuth();
  const { ready, colors } = useAppTheme();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams<{ dev_token?: string }>();

  useEffect(() => {
    if (params?.dev_token && !user) loginWithToken(String(params.dev_token));
  }, [params?.dev_token, user]);

  useEffect(() => {
    if (loading || !ready) return;
    if (params?.dev_token && !user) return; // wait for token login
    const atRoot = pathname === "/";
    const inAuth = segments[0] === "login";
    if (!user) {
      if (!inAuth) router.replace("/login");
    } else if (inAuth || atRoot) {
      router.replace("/(tabs)");
    }
  }, [user, loading, ready, segments, pathname, params?.dev_token, router]);

  if (loading || !ready) return <Loading label="Loading your impact..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="preview" options={{ presentation: "card" }} />
        <Stack.Screen name="result" />
        <Stack.Screen name="recent-scans" />
        <Stack.Screen name="scan-detail" />
        <Stack.Screen name="schedule-pickup" />
        <Stack.Screen name="pickup-qr" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="reward-credited" options={{ presentation: "modal" }} />
        <Stack.Screen name="activity" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="recycler-demo" />
        <Stack.Screen name="about" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <AuthGate />
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
