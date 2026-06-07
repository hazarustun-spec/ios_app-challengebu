import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMyBadges } from '../../hooks/use-my-badges';
import { usePinBadges } from '../../hooks/use-pin-badges';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PinBadgeModal({ visible, onClose }: Props) {
  const { data: badges } = useMyBadges();
  const mutation = usePinBadges();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    const current = (badges ?? []).filter((b) => b.pinned_at).map((b) => b.badge_id);
    setSelected(new Set(current));
  }, [visible, badges]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const save = async () => {
    await mutation.mutateAsync({ selectedBadgeIds: [...selected] });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white p-6">
        <Text className="text-xl font-bold text-gray-900">Vitrin Rozetleri</Text>
        <Text className="mt-1 text-sm text-gray-500">En fazla 3 rozet seçebilirsin.</Text>
        <ScrollView className="mt-4 flex-1">
          {(badges ?? []).length === 0 ? (
            <Text className="mt-4 text-gray-500">Henüz hiç rozet kazanmadın.</Text>
          ) : (
            <View className="flex-row flex-wrap">
              {(badges ?? []).map((b) => {
                const isSelected = selected.has(b.badge_id);
                return (
                  <Pressable
                    key={b.user_badge_id}
                    onPress={() => toggle(b.badge_id)}
                    className={`m-1 h-20 w-20 items-center justify-center rounded-lg border ${
                      isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className="text-3xl">{b.icon}</Text>
                    <Text className="mt-1 text-center text-[10px] text-gray-700" numberOfLines={1}>
                      {b.name_tr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <View className="mt-4 gap-2">
          <Button onPress={save} loading={mutation.isPending}>Kaydet</Button>
          <Button onPress={onClose} variant="ghost">İptal</Button>
        </View>
      </View>
    </Modal>
  );
}
