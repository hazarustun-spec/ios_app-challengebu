import { Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { colors } from '../../theme/colors';

interface Props {
  title: string;
  message: string;
  icon?: IconName;
}

export function EmptyState({ title, message, icon = 'matches' }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Icon name={icon} size={44} color={colors.text3} />
      <Text className="mb-2 mt-4 text-center font-display text-lg font-bold text-text">
        {title}
      </Text>
      <Text className="text-center font-sans text-base text-text-2">{message}</Text>
    </View>
  );
}
