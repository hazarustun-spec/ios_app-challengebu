import { Stack } from 'expo-router';

export default function ProfileStack() {
  return (
    <Stack>
      <Stack.Screen name="edit" options={{ title: 'Profili Düzenle' }} />
    </Stack>
  );
}
