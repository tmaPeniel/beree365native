import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Tabs } from "expo-router";
import { BookOpen, Home, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, LayoutAnimation, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  TABLET_COMPACT_NAV_WIDTH,
  TABLET_EXPANDED_NAV_WIDTH,
  useAdaptiveLayout,
} from "@/shared/layout/adaptive";
import { LiquidGlassTabBar } from "@/shared/navigation/LiquidGlassTabBar";
import { colors, styles } from "@/shared/theme/styles";

const TABLET_SIDEBAR_STATE_KEY = "tablet-sidebar-collapsed";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isTablet, isWideTablet } = useAdaptiveLayout();
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(null);
  const isSidebarCollapsed = sidebarPreference ?? !isWideTablet;
  const navigationWidth = isTablet
    ? isSidebarCollapsed
      ? TABLET_COMPACT_NAV_WIDTH
      : TABLET_EXPANDED_NAV_WIDTH
    : 0;

  useEffect(() => {
    AsyncStorage.getItem(TABLET_SIDEBAR_STATE_KEY)
      .then((storedValue) => {
        if (storedValue === "true" || storedValue === "false") {
          setSidebarPreference(storedValue === "true");
        }
      })
      .catch(() => {
        // La préférence de présentation ne doit jamais bloquer la navigation.
      });
  }, []);

  const setSidebarCollapsed = (nextValue: boolean) => {
    if (nextValue === isSidebarCollapsed) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSidebarPreference(nextValue);
    AsyncStorage.setItem(TABLET_SIDEBAR_STATE_KEY, String(nextValue)).catch(() => {
      // La sidebar reste utilisable même si la préférence ne peut pas être mémorisée.
    });
  };

  const toggleSidebar = () => setSidebarCollapsed(!isSidebarCollapsed);

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
        id={undefined}
        tabBar={(props) => (
          <LiquidGlassTabBar
            {...props}
            isRailCollapsed={isSidebarCollapsed}
            navigationWidth={navigationWidth}
            onSetRailCollapsed={setSidebarCollapsed}
            onToggleRail={toggleSidebar}
          />
        )}
        screenOptions={{
          animation: "shift",
          headerShown: false,
          sceneStyle: {
            backgroundColor: colors.background,
            marginLeft: navigationWidth,
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
