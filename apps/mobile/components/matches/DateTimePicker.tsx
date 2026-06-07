import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { useState } from 'react';

interface Props {
  label: string;
  date: Date | undefined;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  error?: string;
  minimumDate?: Date;
}

export function DateTimeField({ label, date, onChange, mode, error, minimumDate }: Props) {
  const [show, setShow] = useState(false);

  const display = date
    ? mode === 'date'
      ? date.toISOString().slice(0, 10)
      : date.toTimeString().slice(0, 5)
    : 'Seç';

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(selected);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className={`h-12 justify-center rounded-lg border bg-white px-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <Text className="text-base text-gray-900">{display}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date ?? new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}
      {Platform.OS === 'ios' && show && (
        <Pressable onPress={() => setShow(false)} className="mt-2 items-end">
          <Text className="text-primary">Tamam</Text>
        </Pressable>
      )}
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
