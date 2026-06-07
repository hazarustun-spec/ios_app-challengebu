import { Text, View } from 'react-native';

interface Props {
  before: number;
  after: number;
  myLetter: 'a' | 'b';
}

export function EloDeltaDisplay({ before, after }: Props) {
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700';
  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4">
      <Text className="mb-2 text-sm text-gray-500">ELO değişimi</Text>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-gray-500">Önce</Text>
          <Text className="text-2xl font-semibold text-gray-900">{before}</Text>
        </View>
        <Text className={`text-2xl font-bold ${color}`}>{sign}{delta}</Text>
        <View>
          <Text className="text-xs text-gray-500">Sonra</Text>
          <Text className="text-2xl font-semibold text-gray-900">{after}</Text>
        </View>
      </View>
    </View>
  );
}
