import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { colors, fonts } from "@/shared/theme/styles";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.background,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              animation: "slide_from_right",
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: "minimal",
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text, fontFamily: fonts.semibold },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="reading-plan" options={{ headerShown: false }} />
            <Stack.Screen name="verses" options={{ title: "Versets" }} />
            <Stack.Screen name="premium" options={{ title: "Premium" }} />
            <Stack.Screen name="terms" options={{ title: "Conditions" }} />
            <Stack.Screen name="cookies-policy" options={{ title: "Politique cookies" }} />
            <Stack.Screen name="admin" options={{ title: "Administration" }} />
            <Stack.Screen name="profile/statistics" options={{ headerShown: false }} />
            <Stack.Screen name="profile/badges" options={{ headerShown: false }} />
            <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
            <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
            <Stack.Screen name="profile/notifications" options={{ headerShown: false }} />
            <Stack.Screen name="profile/subscription" options={{ headerShown: false }} />
            <Stack.Screen name="profile/privacy" options={{ headerShown: false }} />
            <Stack.Screen name="profile/about" options={{ headerShown: false }} />
            <Stack.Screen name="profile/help" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
