import { Pressable, Text, View } from 'react-native';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  error?: string;
}

export function CheckboxGroup<T extends string>({ label, options, value, onChange, error }: Props<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <View className="gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              className={`flex-row items-center rounded-lg border p-3 ${
                selected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${
                  selected ? 'border-primary bg-primary' : 'border-gray-400'
                }`}
              >
                {selected && <Text className="text-xs font-bold text-white">✓</Text>}
              </View>
              <Text className="text-base text-gray-800">{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
