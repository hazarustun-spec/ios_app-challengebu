import { Pressable, Text, View } from 'react-native';
import type { NotificationRow as Row } from '../../hooks/use-notifications';

interface Props {
  row: Row;
  onPress: () => void;
}

export function NotificationRow({ row, onPress }: Props) {
  const unread = row.read_at === null;
  const ts = new Date(row.created_at);
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 rounded-lg border p-3 ${
        unread ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 text-sm font-semibold text-gray-900">{row.title}</Text>
        <Text className="ml-2 text-[10px] text-gray-500">{formatRelative(ts)}</Text>
      </View>
      <Text className="mt-1 text-xs text-gray-700">{row.body}</Text>
    </Pressable>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}g`;
  return d.toLocaleDateString('tr-TR');
}
