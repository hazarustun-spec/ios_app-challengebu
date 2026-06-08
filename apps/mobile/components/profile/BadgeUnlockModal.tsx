import { Modal, Text, View } from 'react-native';
import type { AwardedBadgeView } from '../../stores/post-match-celebration-store';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  badge: AwardedBadgeView;
  onClose: () => void;
}

export function BadgeUnlockModal({ visible, badge, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <View className="w-full items-center rounded-2xl bg-white p-6">
          <Text className="text-xs font-semibold uppercase text-amber-600">
            Yeni Rozet
          </Text>
          <Text className="mt-2 text-6xl">{badge.icon}</Text>
          <Text className="mt-3 text-xl font-bold text-gray-900">{badge.name_tr}</Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {badge.description_tr}
          </Text>
          <View className="mt-6 w-full">
            <Button onPress={onClose}>Tamam</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
