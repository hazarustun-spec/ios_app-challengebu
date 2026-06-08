import { Modal, Text, View } from 'react-native';
import type { Level } from '@tennis/shared';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  before: Level;
  after: Level;
  onClose: () => void;
}

export function LevelUpModal({ visible, before, after, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <View className="w-full items-center rounded-2xl bg-white p-6">
          <Text className="text-xs font-semibold uppercase text-emerald-600">
            Yeni Seviye
          </Text>
          <Text className="mt-2 text-6xl">{after.icon}</Text>
          <Text className="mt-3 text-xl font-bold text-gray-900">{after.name_tr}</Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {before.icon} {before.name_tr} → {after.icon} {after.name_tr}
          </Text>
          <View className="mt-6 w-full">
            <Button onPress={onClose}>Devam</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
