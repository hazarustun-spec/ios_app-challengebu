import { Text, View } from 'react-native';
import { getLevel } from '@tennis/shared';

interface Props {
  highestElo: number;
}

export function LevelBadge({ highestElo }: Props) {
  const lvl = getLevel(highestElo);
  return (
    <View className="flex-row items-center rounded-full bg-blue-50 px-3 py-1">
      <Text className="text-base">{lvl.icon}</Text>
      <Text className="ml-1 text-sm font-semibold text-primary">{lvl.name_tr}</Text>
    </View>
  );
}
