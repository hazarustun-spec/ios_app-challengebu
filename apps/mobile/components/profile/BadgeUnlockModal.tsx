import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { AwardedBadgeView } from '../../stores/post-match-celebration-store';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { ShareSheet } from '../share/ShareSheet';
import { CardBadgeWon } from '../share/CardBadgeWon';
import { useAuthStore } from '../../stores/auth-store';
import { Icon } from '../ui/Icon';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  badge: AwardedBadgeView;
  onClose: () => void;
}

export function BadgeUnlockModal({ visible, badge, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const myName = profile?.firstName ?? 'Oyuncu';
  const [shareVisible, setShareVisible] = useState(false);

  // Card spring-in: scale 0.85→1, opacity 0→1
  const cardProgress = useSharedValue(0);
  // Badge icon drop+bounce: progress 0→1
  const iconProgress = useSharedValue(0);

  useEffect(() => {
    // Reset for re-mounts
    cardProgress.value = 0;
    iconProgress.value = 0;

    // Haptic on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Card appears first
    cardProgress.value = withSpring(1, { damping: 12, stiffness: 200 });

    // Icon drops in 120ms later with a bouncy spring
    iconProgress.value = withDelay(
      120,
      withSpring(1, { damping: 7, stiffness: 180 }),
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
      transform: [
        { translateY: (1 - p) * -36 },
        { scale: 0.3 + p * 0.7 },
      ],
    };
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-black/60 p-8">
          <Animated.View
            style={[cardStyle, { width: '100%' }]}
          >
            <View className="w-full items-center rounded-2xl bg-white p-6">
              <Text className="text-xs font-semibold uppercase text-amber-600">
                Yeni Rozet
              </Text>
              <Animated.Text style={[{ marginTop: 8, fontSize: 60, textAlign: 'center' }, iconStyle]}>
                {badge.icon}
              </Animated.Text>
              <Text className="mt-3 text-xl font-bold text-gray-900">{badge.name_tr}</Text>
              <Text className="mt-2 text-center text-sm text-gray-600">
                {badge.description_tr}
              </Text>
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

        {/* Confetti over the modal content, one-shot on mount */}
        <Confetti />
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
