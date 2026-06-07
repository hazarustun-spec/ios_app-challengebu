import { Pressable, Text, View } from 'react-native';
import type { MatchRequestRow } from '../../hooks/use-match-requests';
import { StatusBadge } from './StatusBadge';

interface Props {
  request: MatchRequestRow;
  myUserId: string;
  onPress: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export function RequestCard({ request, myUserId, onPress }: Props) {
  const isOutgoing = request.creator_id === myUserId;
  const counterpart = isOutgoing ? request.target_profile : request.creator_profile;
  const counterpartName = counterpart
    ? `${counterpart.first_name} ${counterpart.last_name}`
    : request.type === 'open_call'
      ? 'Açık ilan'
      : 'Bilinmiyor';

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">{counterpartName}</Text>
        <StatusBadge status={request.status} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Text className="text-sm text-gray-600">
          {CATEGORY_LABELS[request.category] ?? request.category}
        </Text>
        <Text className="text-sm text-gray-400">•</Text>
        <Text className="text-sm text-gray-600">
          {FORMAT_LABELS[request.format] ?? request.format}
        </Text>
        <Text className="text-sm text-gray-400">•</Text>
        <Text className="text-sm text-gray-600">
          {request.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'}
        </Text>
      </View>
      <Text className="mt-1 text-sm text-gray-500">
        {request.proposed_date} · {request.proposed_time.slice(0, 5)} · {request.court?.name ?? '—'}
      </Text>
    </Pressable>
  );
}
