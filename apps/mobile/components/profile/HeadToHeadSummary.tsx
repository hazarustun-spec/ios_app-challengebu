import { Text, View } from 'react-native';
import { useHeadToHead } from '../../hooks/use-head-to-head';

interface Props {
  otherUserId: string;
}

export function HeadToHeadSummary({ otherUserId }: Props) {
  const { data } = useHeadToHead(otherUserId);
  if (!data || data.totalMatches === 0) return null;
  return (
    <View className="mt-4 rounded-lg border border-gray-200 bg-blue-50 p-3">
      <Text className="text-sm text-gray-700">
        Aranızda {data.totalMatches} maç: Sen {data.myWins} - O {data.theirWins}
      </Text>
    </View>
  );
}
