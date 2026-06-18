// ScreenEnter — Plan 8 Wave 1 delight animation.
//
// Reusable mount fade + slide-up wrapper. Wraps a screen's root view so
// that on mount the content fades in and slides up 8px → 0 over 280ms,
// giving a subtle sense of arrival without distracting the user.
//
// Usage:
//   <ScreenEnter className="flex-1 bg-bg">
//     {/* screen content */}
//   </ScreenEnter>
//
// Props:
//   children  — screen content
//   className — forwarded to the Animated.View (e.g. "flex-1 bg-bg")
//   style     — additional StyleProp<ViewStyle>
//   delay     — optional delay in ms before the animation starts (default 0)

import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface ScreenEnterProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Optional delay in ms before the enter animation begins. Default 0. */
  delay?: number;
}

export function ScreenEnter({
  children,
  className,
  style,
  delay = 0,
}: ScreenEnterProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [8, 0]) }],
  }));

  return (
    <Animated.View className={className} style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}
