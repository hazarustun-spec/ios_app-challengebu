// Welcome screen — Plan 8 Phase D2.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function Welcome()` lines 20-49.
//
// Lime hero block with doodles (cloud / squiggle / star / dots), a floating
// ball-mark in the top-right, hero copy, and the BÜ-email CTA below.

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { BallMark } from '../../components/ui/doodles/BallMark';
import { Cloud } from '../../components/ui/doodles/Cloud';
import { Dots } from '../../components/ui/doodles/Dots';
import { Squiggle } from '../../components/ui/doodles/Squiggle';
import { Star } from '../../components/ui/doodles/Star';
import { colors } from '../../theme/colors';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 8 + insets.top,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}
    >
      <View
        className="flex-1 bg-lime overflow-hidden"
        style={{
          borderRadius: 34,
          paddingHorizontal: 24,
          paddingVertical: 26,
          justifyContent: 'space-between',
        }}
      >
        {/* Doodle layer — pointerEvents none so the CTA underneath stays tappable */}
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        >
          <Cloud
            w={150}
            color="rgba(22,22,24,0.14)"
            fill="rgba(22,22,24,0.14)"
            style={{ position: 'absolute', top: -10, right: -24 }}
          />
          <Squiggle
            w={70}
            color={colors.pink}
            stroke={4}
            style={{ position: 'absolute', top: 130, left: 24 }}
          />
          <Star
            size={26}
            color="#FFFFFF"
            style={{ position: 'absolute', bottom: 170, right: 34 }}
          />
          <Dots
            size={42}
            color="rgba(22,22,24,0.5)"
            style={{ position: 'absolute', bottom: 150, left: 30 }}
          />
        </View>

        {/* Top row: badge + floating ball */}
        <View className="flex-row items-start justify-between">
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.28)',
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 9999,
            }}
          >
            <Text
              className="text-white font-display font-extrabold"
              style={{ fontSize: 12.5, letterSpacing: 0.25 }}
            >
              BÜ TENİS · LADDER
            </Text>
          </View>
          <FloatyBall />
        </View>

        {/* Hero text */}
        <View>
          <Text
            className="text-white font-display font-extrabold"
            style={{ fontSize: 44, lineHeight: 43, letterSpacing: -1.54 }}
          >
            {'Meydan oku.\nTırman.\nŞampiyon ol.'}
          </Text>
          <Text
            className="font-sans font-bold"
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 15.5,
              marginTop: 16,
              lineHeight: 23,
              maxWidth: 290,
            }}
          >
            Kampüsteki tenis topluluğunun sıralama, maç ve sezon platformu.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 10 }}>
        <Button
          full
          size="lg"
          arrow
          onPress={() => router.push('/(auth)/sign-in')}
        >
          Üniversite e-postanla başla
        </Button>
        <Text
          className="font-sans font-semibold text-text-3"
          style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 19 }}
        >
          Öğrenci, akademisyen ve mezun Boğaziçi hesapları.
        </Text>
      </View>
    </View>
  );
}

function FloatyBall() {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(-7, {
        duration: 2000,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
  }, [y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={style}>
      <BallMark size={52} color="#FFFFFF" stroke={colors.text} />
    </Animated.View>
  );
}
