import { useWindowDimensions } from "react-native";

export const TABLET_BREAKPOINT = 768;
export const TABLET_EXPANDED_BREAKPOINT = 1100;
export const TABLET_COMPACT_NAV_WIDTH = 88;
export const TABLET_EXPANDED_NAV_WIDTH = 224;

export function useAdaptiveLayout() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isWideTablet = width >= TABLET_EXPANDED_BREAKPOINT;

  return {
    height,
    isLandscape: width > height,
    isTablet,
    isWideTablet,
    width,
  };
}
