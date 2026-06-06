import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useAuthStore } from '../../stores/auth-store';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  code: z.string().length(6, '6 haneli kodu gir'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!email) return;
    setLoading(true);
    const { data: result, error } = await supabase.auth.verifyOtp({
      email,
      token: data.code,
      type: 'email',
    });
    setLoading(false);
    if (error || !result.session) {
      Alert.alert('Hata', error?.message ?? 'Kod doğrulanamadı');
      return;
    }
    setSession(result.session);
    router.replace('/');
  };

  return (
    <ScreenContainer scrollable>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Kodu gir</Text>
        <Text className="mb-8 text-base text-gray-600">
          {email}'a 6 haneli kod yolladık.
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Kod"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              error={errors.code?.message}
            />
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} loading={loading}>
          Giriş yap
        </Button>
      </View>
    </ScreenContainer>
  );
}
