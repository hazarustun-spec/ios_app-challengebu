import { useEffect, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import type { AwardedBadgeView } from '../../stores/post-match-celebration-store';
import { Button } from '../ui/Button';
import { BadgeArt } from '../ui/BadgeArt';
import { Confetti } from '../ui/Confetti';
import { ShareSheet } from '../share/ShareSheet';
import { CardBadgeWon } from '../share/CardBadgeWon';
import { useAuthStore } from '../../stores/auth-store';
import { Icon } from '../ui/Icon';
import { colors } from '../../theme/colors';
import { haptics } from '../../lib/haptics';

interface Props {
  visible: boolean;
  badge: AwardedBadgeView;
  onClose: () => void;
}

const HALO_SIZE = 110;

export function BadgeUnlockModal({ visible, badge, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const myName = profile?.firstName ?? 'Oyuncu';
  const [shareVisible, setShareVisible] = useState(false);

  // Card spring-in: scale 0.85→1, opacity 0→1
  const cardProgress = useSharedValue(0);
  // Badge icon spring-in from scale 0 with strong overshoot
  const iconProgress = useSharedValue(0);
  // Text fade + slide-up, staggered after badge
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
    opacity: interpolate(glowPulse.value, [0, 1], [0, 0.4]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [1, 1.25]) }],
  }));

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-black/60 p-8">
          <Animated.View style={[cardStyle, { width: '100%' }]}>
            {/* Solid card — no gradient */}
            <View className="w-full items-center rounded-2xl bg-white p-6">

              {/* Eyebrow label */}
              <Text
                style={{ color: colors.acGold, letterSpacing: 1.5 }}
                className="text-xs font-bold uppercase"
              >
                Yeni Rozet!
              </Text>

              {/* Badge with pulsing glow halo */}
              <View
                style={{
                  marginTop: 12,
                  width: HALO_SIZE,
                  height: 130,
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
                      backgroundColor: colors.acGold,
                    },
                  ]}
                />
                {/* Badge art — springs in from scale 0 with overshoot */}
                <Animated.View style={[iconStyle, { zIndex: 1 }]}>
                  <BadgeArt code={badge.code} size={96} fallback={badge.icon} />
                </Animated.View>
              </View>

              {/* Badge name + description — staggered slide-up entrance */}
              <Animated.View style={[textStyle, { alignItems: 'center' }]}>
                <Text className="mt-3 text-xl font-bold text-gray-900">{badge.name_tr}</Text>
                <Text className="mt-2 text-center text-sm text-gray-600">
                  {badge.description_tr}
                </Text>
              </Animated.View>

              <View className="mt-6 w-full flex-row gap-2">
                <View style={{ flex: 1 }}>
                  <Button
                    variant="secondary"
                    size="lg"
                    full
                    icon={<Icon name="share" size={16} color={colors.text} />}
                    onPress={() => setShareVisible(true)}
                  >
                    Paylaş
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button size="lg" full onPress={onClose}>
                    Tamam
                  </Button>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Confetti burst — one-shot on mount, renders above card */}
        <Confetti count={60} />
      </Modal>

      {/* Share sheet — opens on top of the modal */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title="Rozet kartını paylaş"
      >
        <CardBadgeWon
          name={myName}
          badgeLabel={badge.name_tr}
          badgeEmoji={badge.icon}
          subtitle={badge.description_tr}
        />
      </ShareSheet>
    </>
  );
}
