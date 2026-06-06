import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  email: z
    .string()
    .email('Geçerli bir e-posta gir')
    .refine(
      (e) => e.endsWith('@boun.edu.tr') || e.endsWith('@std.bogazici.edu.tr'),
      'Sadece BÜ e-postası kabul edilir (@boun.edu.tr veya @std.bogazici.edu.tr)',
    ),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-otp', params: { email: data.email } });
  };

  return (
    <ScreenContainer scrollable>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Hoş geldin</Text>
        <Text className="mb-8 text-base text-gray-600">
          BÜ e-postanı gir, sana 6 haneli giriş kodu yollayalım.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="E-posta"
              placeholder="ad.soyad@boun.edu.tr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              error={errors.email?.message}
            />
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} loading={loading}>
          Kod gönder
        </Button>
      </View>
    </ScreenContainer>
  );
}
