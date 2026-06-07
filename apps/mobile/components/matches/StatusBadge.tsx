import { Text, View } from 'react-native';
import type { RequestStatus } from '../../hooks/use-match-requests';

const COLORS: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bekliyor' },
  accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Kabul edildi' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Reddedildi' },
  expired: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Süresi doldu' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Tamamlandı' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const c = COLORS[status];
  return (
    <View className={`${c.bg} self-start rounded-full px-2 py-0.5`}>
      <Text className={`${c.text} text-xs font-medium`}>{c.label}</Text>
    </View>
  );
}
