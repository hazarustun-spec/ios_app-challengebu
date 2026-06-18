import { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Level } from '@tennis/shared';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
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
  // Icon pop-in: scale 0.4→1 with overshoot spring
  const iconProgress = useSharedValue(0);
  // Glow halo pulse: 0→1 repeated
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    // Reset for re-mounts
    cardProgress.value = 0;
    iconProgress.value = 0;
    glowPulse.value = 0;

    // Haptic on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Card appears first
    cardProgress.value = withSpring(1, { damping: 12, stiffness: 200 });

    // Icon pops in with slight overshoot (bouncy spring)
    iconProgress.value = withSpring(1, { damping: 7, stiffness: 180 });

    // Glow halo: pulse opacity + scale 4 times (8 half-cycles) then rest
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

  const iconStyle = useAnimatedStyle(() => {
    const p = iconProgress.value;
    return {
      opacity: p,
      transform: [{ scale: 0.4 + p * 0.6 }],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0, 0.4]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [1, 1.2]) }],
  }));

  // Halo size — wraps the text-6xl icon (~60pt)
  const HALO_SIZE = 112;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <Animated.View style={[cardStyle, { width: '100%' }]}>
          <View className="w-full items-center rounded-2xl bg-white p-6">
            <Text className="text-xs font-semibold uppercase text-emerald-600">
              Yeni Seviye
            </Text>

            {/* Icon with glow halo */}
            <View
              style={{
                marginTop: 8,
                width: HALO_SIZE,
                height: HALO_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Glow circle behind the icon */}
              <Animated.View
                pointerEvents="none"
                style={[
                  glowStyle,
                  {
                    position: 'absolute',
                    width: HALO_SIZE,
                    height: HALO_SIZE,
                    borderRadius: HALO_SIZE / 2,
                    backgroundColor: colors.win,
                  },
                ]}
              />
              {/* Icon */}
              <Animated.Text
                style={[
                  iconStyle,
                  { fontSize: 60, textAlign: 'center', zIndex: 1 },
                ]}
              >
                {after.icon}
              </Animated.Text>
            </View>

            <Text className="mt-3 text-xl font-bold text-gray-900">{after.name_tr}</Text>
            <Text className="mt-2 text-center text-sm text-gray-600">
              {before.icon} {before.name_tr} → {after.icon} {after.name_tr}
            </Text>
            <View className="mt-6 w-full">
              <Button size="lg" full onPress={onClose}>
                Devam
              </Button>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Confetti over the modal content, one-shot on mount */}
      <Confetti />
    </Modal>
  );
}
