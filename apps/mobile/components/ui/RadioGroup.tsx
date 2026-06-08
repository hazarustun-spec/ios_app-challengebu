import { Pressable, Text, View } from 'react-native';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label?: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  error?: string;
}

export function RadioGroup<T extends string>({ label, options, value, onChange, error }: Props<T>) {
  return (
    <View className="mb-4">
      {label ? <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text> : null}
      <View className="gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-row items-center rounded-lg border p-3 ${
              value === opt.value ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
            }`}
          >
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                value === opt.value ? 'border-primary' : 'border-gray-400'
              }`}
            >
              {value === opt.value && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </View>
            <Text className="text-base text-gray-800">{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
