import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface Props {
  icon: string;
  name_tr: string;
  description_tr: string;
  earned: boolean;
}

export function BadgeCard({ icon, name_tr, description_tr, earned }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`m-1 h-20 w-20 items-center justify-center rounded-lg border ${
          earned ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-gray-50'
        } active:opacity-80`}
      >
        <Text className={`text-3xl ${earned ? '' : 'opacity-30'}`}>{icon}</Text>
        <Text
          className={`mt-1 text-center text-[10px] ${
            earned ? 'text-gray-900' : 'text-gray-400'
          }`}
          numberOfLines={1}
        >
          {name_tr}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-8 items-center rounded-2xl bg-white p-6">
            <Text className="text-5xl">{icon}</Text>
            <Text className="mt-3 text-lg font-bold text-gray-900">{name_tr}</Text>
            <Text className="mt-2 text-center text-sm text-gray-600">{description_tr}</Text>
            <Text className={`mt-3 text-xs ${earned ? 'text-green-700' : 'text-gray-400'}`}>
              {earned ? 'Kazanıldı' : 'Henüz kazanılmadı'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
