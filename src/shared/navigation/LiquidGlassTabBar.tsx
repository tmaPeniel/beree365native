import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useMemo } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/shared/theme/styles";

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

export function LiquidGlassTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => (descriptors[route.key]?.options as { href?: string | null }).href !== null),
    [descriptors, state.routes],
  );
  const focusedRoute = state.routes[state.index];
  const activeIndex = Math.max(
    visibleRoutes.findIndex((route) => route.key === focusedRoute?.key),
    0,
  );

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
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: "tabPress",
              });

              if (!isFocused && !event.defaultPrevented) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                key={route.key}
                onLongPress={() => navigation.emit({ target: route.key, type: "tabLongPress" })}
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
