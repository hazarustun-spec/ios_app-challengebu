import { TextInput, Text, View, type TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`h-12 rounded-lg border bg-white px-3 text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholderTextColor="#9ca3af"
        {...inputProps}
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
