import { Text, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { colors } from '../../theme/colors';
import type { PastChampion } from '../../hooks/use-past-champion';

interface Props {
  champion: PastChampion;
}

export function PastChampionPill({ champion }: Props) {
  return (
    <View className="mt-1 flex-row items-center self-center rounded-full bg-amber-100 px-3 py-1">
      <Icon name="crown" size={13} color={colors.warn} />
      <Text className="ml-1 text-xs font-semibold text-amber-900">{champion.label}</Text>
    </View>
  );
}
