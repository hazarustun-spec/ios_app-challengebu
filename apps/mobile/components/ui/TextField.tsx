import { TextInput, Text, View, type TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, multiline, ...inputProps }: Props) {
  const sizeClass = multiline ? 'py-2' : 'h-12';
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`${sizeClass} rounded-lg border bg-white px-3 text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        {...inputProps}
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
