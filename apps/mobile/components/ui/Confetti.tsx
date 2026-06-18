// components/ui/Confetti.tsx
// Lightweight dep-free confetti using react-native-reanimated.
// Mounts as a one-shot overlay: pieces fall once and fade.
// NOTE: Animates fresh every time the parent mounts — acceptable for now
// since result.tsx is unmounted when navigating away.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

const CONFETTI_COLORS = [
  colors.lime,
  colors.limeBright,
  colors.win,
  colors.court,
  colors.star,
  colors.pink,
];

interface PieceParams {
  startX: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  height: number;
}

interface ConfettiPieceProps extends PieceParams {}

function ConfettiPiece({
  startX,
  size,
  color,
  delay,
  duration,
  drift,
  spin,
  height,
}: ConfettiPieceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.linear }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateY = interpolate(p, [0, 1], [-30, height + 40]);
    const translateX = interpolate(p, [0, 1], [0, drift]);
    const rotate = interpolate(p, [0, 1], [0, spin]);
    // Fade to 0 in the last 15% of travel
    const opacity = interpolate(p, [0, 0.85, 1], [1, 1, 0]);

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width: size,
          height: size * 1.6,
          backgroundColor: color,
          borderRadius: 2,
        },
      ]}
    />
  );
}

interface ConfettiProps {
  count?: number;
}

export function Confetti({ count = 42 }: ConfettiProps) {
  const { width, height } = useWindowDimensions();

  const pieces = useMemo<PieceParams[]>(() => {
    return Array.from({ length: count }, () => {
      const size = 6 + Math.random() * 5; // 6..11
      const spinMag = 360 + Math.random() * 540; // 360..900
      return {
        startX: Math.random() * width,
        size,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 400,
        duration: 1800 + Math.random() * 1000, // 1800..2800
        drift: (Math.random() - 0.5) * 140, // -70..70
        spin: Math.random() < 0.5 ? spinMag : -spinMag,
        height,
      };
    });
  }, [count, width, height]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} />
      ))}
    </View>
  );
}
