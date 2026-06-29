import { Redirect, Tabs } from "expo-router";
import { BookOpen, Home, User } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LiquidGlassTabBar } from "@/shared/navigation/LiquidGlassTabBar";
import { colors, styles } from "@/shared/theme/styles";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <Tabs
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{
          animation: "shift",
          headerShown: false,
          sceneStyle: {
            backgroundColor: colors.background,
          },
          tabBarHideOnKeyboard: true,
          transitionSpec: {
            animation: "timing",
            config: {
              duration: 210,
            },
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Accueil",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.9} />,
          }}
        />
        <Tabs.Screen
          name="reading"
          options={{
            title: "Lecture",
            tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} strokeWidth={1.9} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.9} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
