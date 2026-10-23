import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import type { BottomTabBarProps } from "expo-router/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfileInitials, ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  TABLET_COMPACT_NAV_WIDTH,
  TABLET_EXPANDED_NAV_WIDTH,
  useAdaptiveLayout,
} from "@/shared/layout/adaptive";
import { colors, fonts } from "@/shared/theme/styles";

const BAR_HEIGHT = 62;
const BAR_WIDTH = 272;
const BAR_PADDING = 6;
const ITEM_GAP = 8;
const ACTIVE_ITEM_WIDTH = 132;
const INACTIVE_ITEM_WIDTH = 56;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getRouteLabel(options: BottomTabBarProps["descriptors"][string]["options"], routeName: string) {
  if (typeof options.tabBarLabel === "string") {
    return options.tabBarLabel;
  }

  if (typeof options.title === "string") {
    return options.title;
  }

  return routeName;
}

type LiquidGlassTabBarProps = BottomTabBarProps & {
  emitter?: { emit: (event: Record<string, unknown>) => { defaultPrevented?: boolean } };
  isRailCollapsed: boolean;
  navigateToTab?: (routeKey: string) => void;
  navigation?: {
    emit: (event: Record<string, unknown>) => { defaultPrevented?: boolean };
    navigate: (routeName: string, params?: object) => void;
  };
  navigationWidth: number;
  onSetRailCollapsed: (collapsed: boolean) => void;
  onToggleRail: () => void;
};

export function LiquidGlassTabBar({
  descriptors,
  emitter,
  isRailCollapsed,
  navigateToTab,
  navigation,
  navigationWidth,
  onSetRailCollapsed,
  onToggleRail,
  state,
}: LiquidGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useAdaptiveLayout();
  const { profile, user } = useAuth();
  const isRailExpanded = !isRailCollapsed;
  const railWidth = useSharedValue(navigationWidth);
  const gestureStartWidth = useSharedValue(navigationWidth);
  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => (descriptors[route.key]?.options as { href?: string | null }).href !== null),
    [descriptors, state.routes],
  );
  const focusedRoute = state.routes[state.index];
  const activeIndex = Math.max(
    visibleRoutes.findIndex((route) => route.key === focusedRoute?.key),
    0,
  );
  const profileInitials = getProfileInitials(profile?.full_name, user?.email);
  const profileName = profile?.full_name?.trim() || "Mon compte";
  const profileRoute = visibleRoutes.find((route) => route.name === "profile");

  const emitNavigationEvent = (event: Record<string, unknown>) => (
    emitter?.emit(event) ?? navigation?.emit(event) ?? { defaultPrevented: false }
  );

  const navigateToRoute = (route: (typeof state.routes)[number]) => {
    if (navigateToTab) {
      navigateToTab(route.key);
      return;
    }

    navigation?.navigate(route.name, route.params);
  };

  useEffect(() => {
    railWidth.value = withSpring(navigationWidth, {
      damping: 22,
      stiffness: 230,
    });
  }, [navigationWidth, railWidth]);

  const railAnimatedStyle = useAnimatedStyle(() => ({
    width: railWidth.value,
  }));

  const railPanGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      gestureStartWidth.value = railWidth.value;
    })
    .onUpdate((event) => {
      railWidth.value = Math.max(
        TABLET_COMPACT_NAV_WIDTH,
        Math.min(TABLET_EXPANDED_NAV_WIDTH, gestureStartWidth.value + event.translationX),
      );
    })
    .onEnd((event) => {
      const midpoint = (TABLET_COMPACT_NAV_WIDTH + TABLET_EXPANDED_NAV_WIDTH) / 2;
      const shouldExpand = event.velocityX > 520
        || (event.velocityX >= -520 && railWidth.value >= midpoint);
      const targetWidth = shouldExpand ? TABLET_EXPANDED_NAV_WIDTH : TABLET_COMPACT_NAV_WIDTH;

      railWidth.value = withSpring(targetWidth, {
        damping: 22,
        stiffness: 230,
        velocity: event.velocityX,
      });
      runOnJS(onSetRailCollapsed)(!shouldExpand);
    });

  const openProfile = () => {
    if (!profileRoute) return;

    const isFocused = profileRoute.key === focusedRoute?.key;
    const event = emitNavigationEvent({
      canPreventDefault: true,
      target: profileRoute.key,
      type: "tabPress",
    });

    if (!isFocused && !event.defaultPrevented) {
      navigateToRoute(profileRoute);
    }
  };

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: {
        duration: 180,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        duration: 130,
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      update: {
        duration: 220,
        springDamping: 0.82,
        type: LayoutAnimation.Types.spring,
      },
    });
  }, [activeIndex]);

  if (isTablet) {
    return (
      <GestureDetector gesture={railPanGesture}>
        <Animated.View
          style={[
            styles.rail,
            railAnimatedStyle,
            {
              paddingBottom: Math.max(insets.bottom, 18),
              paddingTop: 18,
            },
          ]}
        >
        <View style={[styles.railBrand, isRailExpanded && styles.railBrandExpanded]}>
          <Image
            accessibilityLabel="Bérée 365"
            contentFit="contain"
            source={require("@/assets/beree-logo.png")}
            style={[styles.railLogo, isRailExpanded && styles.railLogoExpanded]}
          />
        </View>

        <View style={[styles.railItems, isRailExpanded && styles.railItemsExpanded]}>
          {visibleRoutes.map((route, index) => {
            const options = descriptors[route.key].options;
            const isFocused = index === activeIndex;
            const label = getRouteLabel(options, route.name);
            const color = isFocused ? colors.primary : "#74665B";

            const onPress = () => {
              const event = emitNavigationEvent({
                canPreventDefault: true,
                target: route.key,
                type: "tabPress",
              });

              if (!isFocused && !event.defaultPrevented) {
                navigateToRoute(route);
              }
            };

            return (
              <Pressable
                accessibilityLabel={options.tabBarAccessibilityLabel || label}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                key={route.key}
                onLongPress={() => emitNavigationEvent({ target: route.key, type: "tabLongPress" })}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.railItem,
                  isRailExpanded && styles.railItemExpanded,
                  isFocused && styles.railItemActive,
                  pressed && styles.railItemPressed,
                ]}
              >
                {options.tabBarIcon?.({ color, focused: isFocused, size: 23 })}
                {isRailExpanded ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.railLabel, isFocused && styles.railLabelActive]}
                  >
                    {label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityLabel="Ouvrir mon profil"
          accessibilityRole="button"
          onPress={openProfile}
          style={({ pressed }) => [
            styles.railAccount,
            isRailExpanded && styles.railAccountExpanded,
            pressed && styles.railAccountPressed,
          ]}
        >
          <ProfileAvatar avatarUrl={profile?.avatar_url} initials={profileInitials} size={40} />
          {isRailExpanded ? (
            <View style={styles.railAccountCopy}>
              <Text numberOfLines={1} style={styles.railAccountName}>{profileName}</Text>
              <Text numberOfLines={1} style={styles.railAccountLabel}>Mon compte</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityLabel={isRailCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleRail}
          style={({ pressed }) => [styles.railEdgeToggle, pressed && styles.railEdgeTogglePressed]}
        >
          <View style={styles.railEdgeToggleSurface}>
            {isRailCollapsed ? (
              <ChevronRight color={colors.primaryDark} size={14} strokeWidth={2} />
            ) : (
              <ChevronLeft color={colors.primaryDark} size={14} strokeWidth={2} />
            )}
          </View>
        </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 10),
          left: 0,
          right: 0,
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.5)", "rgba(252,251,247,0.32)", "rgba(245,236,229,0.24)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.bar}
      >
        <View pointerEvents="none" style={styles.glassStroke} />

        <View style={styles.items}>
          {visibleRoutes.map((route, index) => {
            const options = descriptors[route.key].options;
            const isFocused = index === activeIndex;
            const color = isFocused ? "#2B1F12" : "rgba(43,31,18,0.78)";
            const label = getRouteLabel(options, route.name);

            const onPress = () => {
              const event = emitNavigationEvent({
                canPreventDefault: true,
                target: route.key,
                type: "tabPress",
              });

              if (!isFocused && !event.defaultPrevented) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                navigateToRoute(route);
              }
            };

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                key={route.key}
                onLongPress={() => emitNavigationEvent({ target: route.key, type: "tabLongPress" })}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.item,
                  isFocused ? styles.itemActive : styles.itemInactive,
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      transform: [{ scale: isFocused ? 1.07 : 1 }],
                    },
                  ]}
                >
                  {options.tabBarIcon?.({
                    color,
                    focused: isFocused,
                    size: 22,
                  })}
                </View>
                {isFocused ? (
                  <>
                    <Text numberOfLines={1} style={styles.label}>
                      {label}
                    </Text>
                    <View style={styles.activeDot} />
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRightColor: "rgba(43,31,18,0.08)",
    borderRightWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    position: "absolute",
    top: 0,
  },
  railBrand: {
    alignItems: "center",
    alignSelf: "stretch",
    height: 76,
    justifyContent: "center",
  },
  railBrandExpanded: {
    height: 72,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  railLogo: {
    height: 64,
    width: 64,
  },
  railLogoExpanded: {
    height: 68,
    width: 134,
  },
  railEdgeToggle: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: "47%",
    width: 44,
    zIndex: 4,
  },
  railEdgeTogglePressed: {
    opacity: 0.48,
  },
  railEdgeToggleSurface: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(48,39,32,0.12)",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: "center",
    opacity: 0.72,
    transform: [{ translateX: 10 }],
    width: 20,
  },
  railItems: {
    alignSelf: "stretch",
    gap: 6,
    marginTop: 18,
  },
  railItemsExpanded: {
    marginTop: 26,
  },
  railItem: {
    alignItems: "center",
    borderRadius: 14,
    gap: 6,
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  railItemExpanded: {
    flexDirection: "row",
    gap: 13,
    justifyContent: "flex-start",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  railItemActive: {
    backgroundColor: colors.surfaceSoft,
  },
  railItemPressed: {
    opacity: 0.68,
  },
  railLabel: {
    color: "#74665B",
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  railLabelActive: {
    color: colors.primaryDark,
    fontFamily: fonts.semibold,
  },
  railAccount: {
    alignItems: "center",
    alignSelf: "stretch",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: "auto",
    paddingTop: 16,
  },
  railAccountExpanded: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
  },
  railAccountPressed: {
    opacity: 0.62,
  },
  railAccountCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  railAccountName: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  railAccountLabel: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  wrap: {
    alignItems: "center",
    height: BAR_HEIGHT,
    position: "absolute",
  },
  bar: {
    borderColor: "rgba(255,255,255,0.62)",
    borderRadius: 31,
    borderWidth: 1,
    height: BAR_HEIGHT,
    overflow: "hidden",
    padding: BAR_PADDING,
    width: BAR_WIDTH,
  },
  glassStroke: {
    borderColor: "rgba(43,31,18,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    bottom: 1,
    left: 1,
    position: "absolute",
    right: 1,
    top: 1,
  },
  items: {
    flexDirection: "row",
    gap: ITEM_GAP,
    height: "100%",
  },
  item: {
    alignItems: "center",
    borderRadius: 25,
    flexDirection: "row",
    gap: 11,
    justifyContent: "center",
    minWidth: 0,
  },
  itemActive: {
    paddingHorizontal: 18,
    width: ACTIVE_ITEM_WIDTH,
  },
  itemInactive: {
    width: INACTIVE_ITEM_WIDTH,
  },
  iconWrap: {
    height: 24,
    justifyContent: "center",
  },
  label: {
    color: "#2B1F12",
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 19,
  },
  activeDot: {
    backgroundColor: "#B55F2C",
    borderRadius: 999,
    height: 5,
    width: 5,
  },
});
