import { useEffect, useRef } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import type { Level } from '@tennis/shared';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { RankBadge } from '../ui/RankBadge';
import { haptics } from '../../lib/haptics';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  before: Level;
  after: Level;
  onClose: () => void;
}

export function LevelUpModal({ visible, before, after, onClose }: Props) {
  // Card spring-in: scale 0.85→1, opacity 0→1
  const cardProgress = useSharedValue(0);
  // Icon pop-in: scale 0→1 with strong overshoot spring
  const iconProgress = useSharedValue(0);
  // Text fade + slide-up entrance, staggered after badge
  const textProgress = useSharedValue(0);
  // Glow halo pulse: 0→1 repeated
  const glowPulse = useSharedValue(0);

  // Guard: haptic fires exactly once per modal appearance
  const hapticFired = useRef(false);

  useEffect(() => {
    // Reset animation values for each fresh mount
    cardProgress.value = 0;
    iconProgress.value = 0;
    textProgress.value = 0;
    glowPulse.value = 0;

    // Haptic success — ref guard prevents double-fire in React StrictMode
    if (!hapticFired.current) {
      hapticFired.current = true;
      haptics.success();
    }

    // Card appears first
    cardProgress.value = withSpring(1, { damping: 12, stiffness: 200 });

    // Badge springs in from scale 0 with strong overshoot (damping 5 = very bouncy)
    iconProgress.value = withSpring(1, { damping: 5, stiffness: 160 });

    // Text slides up after the badge has bounced in
    textProgress.value = withDelay(
      200,
      withSpring(1, { damping: 14, stiffness: 180 }),
    );

    // Glow halo: pulse 4 times then rest
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 500 }),
      ),
      4,
      false,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cardProgress.value, { duration: 180 }),
    transform: [{ scale: 0.85 + cardProgress.value * 0.15 }],
  }));

  // Scale starts at 0 — withSpring overshoots past 1 naturally for the "pop"
  const iconStyle = useAnimatedStyle(() => {
    const p = iconProgress.value;
    return {
      // Snap opacity to 1 quickly so the overshoot is visible, not faded
      opacity: interpolate(p, [0, 0.2, 1], [0, 1, 1]),
      transform: [{ scale: p }],
    };
  });

  // Text slides up 10pt and fades in
  const textStyle = useAnimatedStyle(() => ({
    opacity: textProgress.value,
    transform: [
      { translateY: interpolate(textProgress.value, [0, 1], [10, 0]) },
    ],
  }));

  // Glow halo pulses in scale + opacity
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0, 0.35]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [1, 1.25]) }],
  }));

  // Halo circle wraps the 110pt badge
  const HALO_SIZE = 120;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <Animated.View style={[cardStyle, { width: '100%' }]}>
          {/* Solid white card — no gradient */}
          <View className="w-full items-center rounded-2xl bg-white p-6">

            {/* Eyebrow label */}
            <Text
              style={{ color: colors.limeDeep, letterSpacing: 1.5 }}
              className="text-xs font-bold uppercase"
            >
              Yeni seviye!
            </Text>

            {/* Badge with pulsing glow halo */}
            <View
              style={{
                marginTop: 12,
                width: HALO_SIZE,
                height: 160,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Gold glow disc behind the badge */}
              <Animated.View
                pointerEvents="none"
                style={[
                  glowStyle,
                  {
                    position: 'absolute',
                    width: HALO_SIZE,
                    height: HALO_SIZE,
                    borderRadius: HALO_SIZE / 2,
                    backgroundColor: colors.star,
                  },
                ]}
              />
              {/* Rank medallion — springs in from scale 0 with overshoot */}
              <Animated.View style={[iconStyle, { zIndex: 1 }]}>
                <RankBadge level={after.code} size={110} fallback={after.icon} />
              </Animated.View>
            </View>

            {/* Level name + journey line — staggered slide-up entrance */}
            <Animated.View style={[textStyle, { alignItems: 'center' }]}>
              <Text className="mt-2 text-2xl font-bold text-gray-900">
                {after.name_tr}
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500">
                {before.icon} {before.name_tr} → {after.icon} {after.name_tr}
              </Text>
            </Animated.View>

            <View className="mt-6 w-full">
              <Button size="lg" full onPress={onClose}>
                Harika!
              </Button>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Confetti burst — one-shot on mount, renders above card */}
      <Confetti count={60} />
    </Modal>
  );
}
