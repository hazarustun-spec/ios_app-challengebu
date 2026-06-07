import { Pressable, Text, View } from 'react-native';

export type MatchFormat = 'bu_klasik' | 'hizli_tiebreak' | 'pro_set_8' | '3set_klasik';

const FORMATS: { value: MatchFormat; label: string; duration: string; description: string }[] = [
  {
    value: 'bu_klasik',
    label: 'BÜ Klasik',
    duration: '~60 dk',
    description: '4 el alan kazanır. 3-3 olursa maç yapılmamış sayılır.',
  },
  {
    value: 'hizli_tiebreak',
    label: 'Hızlı Tiebreak',
    duration: '~20 dk',
    description: '10 sayılık match tiebreak.',
  },
  {
    value: 'pro_set_8',
    label: 'Pro Set 8',
    duration: '~75 dk',
    description: '8 game alan kazanır.',
  },
  {
    value: '3set_klasik',
    label: '3 Set Klasik',
    duration: '~2 saat',
    description: 'ATP standardı.',
  },
];

interface Props {
  value: MatchFormat | undefined;
  onChange: (v: MatchFormat) => void;
  error?: string;
}

export function FormatPicker({ value, onChange, error }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">Format</Text>
      {FORMATS.map((f) => {
        const selected = value === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            className={`mb-2 rounded-lg border p-3 ${
              selected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">{f.label}</Text>
              <Text className="text-sm text-gray-600">{f.duration}</Text>
            </View>
            <Text className="mt-1 text-sm text-gray-600">{f.description}</Text>
          </Pressable>
        );
      })}
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
