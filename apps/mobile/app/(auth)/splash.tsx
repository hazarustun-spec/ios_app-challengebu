// Splash screen — Plan 8 Phase D1.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function Splash()` lines 7-18.
//
// Renders the BÜ tenis ball mark in the center, three pulsing clay dots near
// the bottom, then auto-replaces to the welcome screen after 1500ms.

import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BallMark } from '../../components/ui/doodles/BallMark';
import { colors } from '../../theme/colors';

const SPLASH_DURATION_MS = 1500;

export default function Splash() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(auth)/welcome'), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      className="flex-1 items-center justify-center bg-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <BallMark size={96} />
      <View
        style={{
          position: 'absolute',
          bottom: 60,
          flexDirection: 'row',
          gap: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 180} />
        ))}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Stagger the pulse start so the three dots ripple in sequence.
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.clay,
        },
        style,
      ]}
    />
  );
}
