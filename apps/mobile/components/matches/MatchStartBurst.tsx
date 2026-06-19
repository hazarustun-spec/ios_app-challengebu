// components/matches/MatchStartBurst.tsx
//
// Full-screen overlay animation played when both players confirm "Maçı Başlat".
// Sequence (total ~1.6 s):
//   0 ms    – lime background fades in
//   0→700ms – tennis ball arcs in from bottom-left to centre (translateX/Y +
//              rotate + scale)
//   500 ms  – haptic + explosion rings expand + fade
//   700 ms  – "Maç Başladı!" text springs in
//   1600 ms – onDone() called (navigation to score screen)
//
// Kept intentionally self-contained (no context, just `onDone` prop).

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BallMark } from '../ui/doodles/BallMark';
import { Confetti } from '../ui/Confetti';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

interface MatchStartBurstProps {
  onDone: () => void;
}

const RING_COUNT = 4;

function ExplosionRing({ index }: { index: number }) {
  const progress = useSharedValue(0);
  const delay = index * 80;

  useEffect(() => {
    progress.value = withDelay(
      500 + delay,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const scale = 1 + progress.value * (2.5 + index * 0.8);
    const opacity = 1 - progress.value;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const size = 80 + index * 20;

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: index % 2 === 0 ? colors.lime : colors.win,
        },
      ]}
    />
  );
}

export function MatchStartBurst({ onDone }: MatchStartBurstProps) {
  const hasFiredHaptic = useRef(false);
  const hasFiredDone = useRef(false);

  // Background fade-in
  const bgOpacity = useSharedValue(0);

  // Ball position + rotation + scale
  const ballX = useSharedValue(-100);
  const ballY = useSharedValue(200);
  const ballRotate = useSharedValue(-45);
  const ballScale = useSharedValue(0.4);

  // Text spring
  const textScale = useSharedValue(0.6);
  const textOpacity = useSharedValue(0);

  function fireHapticOnce() {
    if (!hasFiredHaptic.current) {
      hasFiredHaptic.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function fireDoneOnce() {
    if (!hasFiredDone.current) {
      hasFiredDone.current = true;
      onDone();
    }
  }

  useEffect(() => {
    // 1. Background
    bgOpacity.value = withTiming(1, { duration: 200 });

    // 2. Ball arc in from bottom-left to centre
    const ballOpts = { duration: 700, easing: Easing.out(Easing.cubic) };
    ballX.value = withTiming(0, ballOpts);
    ballY.value = withTiming(0, ballOpts);
    ballRotate.value = withTiming(360, ballOpts);
    ballScale.value = withTiming(1.15, { duration: 700, easing: Easing.out(Easing.back(1.5)) });

    // 3. Haptic at the burst moment (500 ms)
    const hapticTimer = setTimeout(() => {
      runOnJS(fireHapticOnce)();
    }, 500);

    // 4. Text springs in at 700 ms
    textScale.value = withDelay(
      700,
      withSpring(1, { damping: 10, stiffness: 180, mass: 0.8 }),
    );
    textOpacity.value = withDelay(700, withTiming(1, { duration: 120 }));

    // 5. Navigate at 1600 ms
    const doneTimer = setTimeout(() => {
      runOnJS(fireDoneOnce)();
    }, 1600);

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballX.value },
      { translateY: ballY.value },
      { rotate: `${ballRotate.value}deg` },
      { scale: ballScale.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        bgStyle,
        {
          backgroundColor: colors.lime,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        },
      ]}
    >
      {/* Confetti layer */}
      <Confetti count={48} />

      {/* Explosion rings (centred) */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: RING_COUNT }, (_, i) => (
          <ExplosionRing key={i} index={i} />
        ))}

        {/* Flying tennis ball */}
        <Animated.View style={ballStyle}>
          <BallMark size={96} color={colors.limeBright} stroke={colors.text} sw={3.5} />
        </Animated.View>
      </View>

      {/* "Maç Başladı!" text */}
      <Animated.View
        style={[
          textStyle,
          { position: 'absolute', bottom: '30%', left: 0, right: 0, alignItems: 'center' },
        ]}
      >
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: colors.text,
            letterSpacing: -0.5,
            textAlign: 'center',
            fontWeight: '800',
          }}
        >
          Maç Başladı!
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 16,
            color: colors.limeDeep,
            marginTop: 6,
            fontWeight: '600',
          }}
        >
          İyi oyunlar 🎾
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
