import { Stack } from 'expo-router';

export default function YearlyStack() {
  return (
    <Stack>
      <Stack.Screen name="[year]" options={{ title: 'Yıllık Şampiyonluk' }} />
    </Stack>
  );
}
