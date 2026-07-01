// OTP / magic-link screen — Plan 8 Phase D4.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function OtpScreen({ params })` lines 77-112.
//
// Renders 6 single-digit inputs. Auto-advances focus on input, backspace
// jumps to the previous cell, and auto-submits when all 6 cells fill. Also
// surfaces a 60s resend cooldown + the "Sihirli bağlantıyı kullandım"
// secondary action.

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getOtpOptions,
  isReviewEmail,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SEC,
} from '@tennis/shared';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { NavHeader } from '../../components/ui/NavHeader';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { reviewLogin } from '../../lib/review-auth';
import { useAuthStore } from '../../stores/auth-store';

export default function OtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [code, setCode] = useState<string[]>(() =>
    Array<string>(OTP_LENGTH).fill(''),
  );
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  const filled = code.join('').length === OTP_LENGTH;

  // Auto-submit when all cells have a digit.
  useEffect(() => {
    if (!filled || verifying) return;
    void handleVerify(code.join(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    setCode((c) => c.map((x, j) => (j === i ? v : x)));
    if (v && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    i: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && code[i] === '' && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async (token: string) => {
    if (!email) {
      Alert.alert('Hata', 'E-posta adresi bulunamadı, baştan başla.');
      return;
    }
    setVerifying(true);
    try {
      // App Store review account: authenticate the fixed review code via the
      // review-login function instead of the normal mailed-OTP verification.
      if (isReviewEmail(email)) {
        const session = await reviewLogin(email, token);
        setSession(session);
        router.replace('/');
        return;
      }
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      if (data.session) setSession(data.session);
      // Root index.tsx handles the branching between onboarding & app.
      router.replace('/');
    } catch (err) {
      Alert.alert(
        'Geçersiz kod',
        err instanceof Error ? err.message : 'Kod yanlış veya süresi doldu.',
      );
      setCode(Array<string>(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    // Review account: nothing is mailed, so there is nothing to resend.
    if (isReviewEmail(email)) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: getOtpOptions({ email, withMagicLink: true }),
      });
      if (error) throw error;
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err) {
      Alert.alert(
        'Hata',
        err instanceof Error
          ? err.message
          : 'Kod yeniden gönderilemedi.',
      );
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader onBack={() => router.back()} />
      <View
        style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center' }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: colors.claySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
            marginBottom: 22,
          }}
        >
          <Icon name="mail" size={30} color={colors.clay} />
        </View>
        <Text
          className="font-display font-extrabold text-text"
          style={{
            fontSize: 25,
            marginBottom: 8,
            letterSpacing: -0.5,
            textAlign: 'center',
          }}
        >
          Gelen kutunu kontrol et
        </Text>
        <Text
          className="font-sans text-text-2"
          style={{
            fontSize: 14.5,
            lineHeight: 22,
            textAlign: 'center',
            marginBottom: 30,
          }}
        >
          <Text className="text-text font-bold">
            {email ?? 'e-postana'}
          </Text>{' '}
          adresine 6 haneli bir kod ve sihirli bağlantı gönderdik.
        </Text>

        <View style={{ flexDirection: 'row', gap: 9, marginBottom: 24 }}>
          {code.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r;
              }}
              value={d}
              onChangeText={(v) => setDigit(i, v.slice(-1))}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              editable={!verifying}
              textContentType="oneTimeCode"
              style={{
                width: 44,
                height: 56,
                textAlign: 'center',
                fontSize: 24,
                fontFamily: 'SpaceGrotesk-ExtraBold',
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: d ? colors.clay : colors.borderStrong,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={handleResend}
          disabled={resendCooldown > 0 || verifying}
          accessibilityRole="button"
          style={{ paddingVertical: 4 }}
        >
          <Text
            className="font-sans font-bold"
            style={{
              fontSize: 14,
              color: resendCooldown > 0 ? colors.text3 : colors.clay,
            }}
          >
            {resendCooldown > 0
              ? `Kod tekrar gönderildi · 0:${String(resendCooldown).padStart(2, '0')}`
              : 'Kodu tekrar gönder'}
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 24, paddingTop: 8 }}>
        <Button
          full
          size="lg"
          variant="secondary"
          icon={<Icon name="link" size={20} color={colors.text} />}
          onPress={() =>
            Alert.alert(
              'Sihirli bağlantı',
              "Mail'deki linke tıkla; uygulamaya geri dönünce devam edebilirsin.",
            )
          }
          disabled={verifying}
        >
          Sihirli bağlantıyı kullandım
        </Button>
      </View>
    </View>
  );
}
