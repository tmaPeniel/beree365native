import { useEffect } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type MotionViewProps = PropsWithChildren<{
  delay?: number;
  layout?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

type AnimatedProgressBarProps = {
  duration?: number;
  fillStyle?: StyleProp<ViewStyle>;
  minPercent?: number;
  progress: number;
  style?: StyleProp<ViewStyle>;
};

type PressableScaleProps = PressableProps & {
  children: ReactNode;
  pressedScale?: number;
  style?: PressableProps["style"];
};

export function MotionView({ children, delay = 0, layout = true, style }: MotionViewProps) {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? FadeIn.duration(1)
    : FadeInDown.delay(delay).duration(520).easing(Easing.out(Easing.cubic));
  const layoutAnimation = !reducedMotion && layout
    ? LinearTransition.springify().damping(19).stiffness(210)
    : undefined;

  return (
    <Animated.View entering={entering} layout={layoutAnimation} style={style}>
      {children}
    </Animated.View>
  );
}

export function AnimatedProgressBar({
  duration = 650,
  fillStyle,
  minPercent = 0,
  progress,
  style,
}: AnimatedProgressBarProps) {
  const reducedMotion = useReducedMotion();
  const progressValue = useSharedValue(0);
  const clampedProgress = Math.max(0, Math.min(progress, 100));

  useEffect(() => {
    progressValue.value = withTiming(clampedProgress, {
      duration: reducedMotion ? 0 : duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress, duration, progressValue, reducedMotion]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progressValue.value, minPercent)}%`,
  }));

  return (
    <View style={style}>
      <Animated.View style={[fillStyle, animatedFillStyle]} />
    </View>
  );
}

export function PressableScale({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.97,
  style,
  ...props
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled && !reducedMotion) {
            scale.value = withSpring(pressedScale, { damping: 16, stiffness: 320 });
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!disabled && !reducedMotion) {
            scale.value = withSpring(1, { damping: 15, stiffness: 280 });
          }
          onPressOut?.(event);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
