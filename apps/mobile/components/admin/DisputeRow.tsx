import { Pressable, Text, View } from 'react-native';
import type { PendingDispute } from '../../hooks/use-pending-disputes';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

interface Props {
  dispute: PendingDispute;
  onPress: () => void;
}

export function DisputeRow({ dispute, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-amber-900">
          {dispute.raised_by_name} itiraz açtı
        </Text>
        <Text className="text-[10px] text-amber-800">
          {new Date(dispute.created_at).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-amber-800">
        {CATEGORY_LABELS[dispute.match_category] ?? dispute.match_category}
      </Text>
      <Text className="mt-1 text-xs text-amber-900" numberOfLines={2}>
        {dispute.reason}
      </Text>
    </Pressable>
  );
}
