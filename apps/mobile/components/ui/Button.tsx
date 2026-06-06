import { Pressable, Text, ActivityIndicator } from 'react-native';

interface Props {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ onPress, children, disabled, loading, variant = 'primary' }: Props) {
  const bg = variant === 'primary' ? 'bg-primary' : variant === 'secondary' ? 'bg-secondary' : 'bg-transparent';
  const text = variant === 'ghost' ? 'text-primary' : 'text-white';
  const disabledClass = disabled || loading ? 'opacity-50' : '';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${bg} ${disabledClass} h-12 items-center justify-center rounded-lg px-4 active:opacity-80`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`${text} text-base font-semibold`}>{children}</Text>
      )}
    </Pressable>
  );
}
