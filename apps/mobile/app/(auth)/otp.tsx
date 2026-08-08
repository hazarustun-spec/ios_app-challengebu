// OTP / magic-link screen — Plan 8 Phase D4.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function OtpScreen({ params })` lines 77-112.
//
// Renders 6 digit cells and auto-submits once all 6 are filled. Also surfaces a
// 60s resend cooldown + the "Sihirli bağlantıyı kullandım" secondary action.
//
// The cells are presentational: a single full-width TextInput sitting invisibly
// on top of them owns the whole code. An earlier version gave each cell its own
// maxLength={1} input and hopped focus forward on every keystroke, which dropped
// and duplicated digits when the code was typed at speed (see lib/otp-code.ts)
// and kept only one digit when it was pasted.

import { OTP_LENGTH, OTP_RESEND_COOLDOWN_SEC, getOtpOptions, isReviewEmail } from '@tennis/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { NavHeader } from '../../components/ui/NavHeader';
import { sanitizeOtp } from '../../lib/otp-code';
import { reviewLogin } from '../../lib/review-auth';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

export default function OtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const input = useRef<TextInput | null>(null);

  const filled = code.length === OTP_LENGTH;
  const isReview = !!email && isReviewEmail(email);

  // Auto-submit once the last digit lands.
  useEffect(() => {
    if (!filled || verifying) return;
    void handleVerify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
      setCode('');
      input.current?.focus();
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
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kod yeniden gönderilemedi.');
    }
  };

  return (
    // The number pad is tall enough on iPad — where an iPhone-sized app runs in
    // compatibility mode — to bury the footer button, so lift the whole screen
    // above it rather than letting it sit underneath.
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <NavHeader onBack={() => router.back()} />
      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center' }}>
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
          {isReview ? 'Doğrulama kodunu gir' : 'Gelen kutunu kontrol et'}
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
          {isReview ? (
            <>
              Bu uygulama şifre kullanmaz — yalnızca 6 haneli OTP ile giriş yapılır. App Store
              Connect notlarında belirtilen 6 haneli kodu aşağıya gir.
            </>
          ) : (
            <>
              <Text className="text-text font-bold">{email ?? 'e-postana'}</Text> adresine 6 haneli
              bir kod ve sihirli bağlantı gönderdik.
            </>
          )}
        </Text>

        {/* Six presentational cells with one invisible input laid over them.
            Tapping anywhere on the row focuses that single input, so no
            keystroke can arrive at a cell that is still handing over focus. */}
        <Pressable
          onPress={() => input.current?.focus()}
          accessibilityRole="none"
          style={{ marginBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {Array.from({ length: OTP_LENGTH }, (_, i) => {
              const digit = code[i] ?? '';
              const active = !verifying && i === Math.min(code.length, OTP_LENGTH - 1);
              return (
                <View
                  key={i}
                  style={{
                    width: 44,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: digit || active ? colors.clay : colors.borderStrong,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: 'SpaceGrotesk-ExtraBold',
                      color: colors.text,
                    }}
                  >
                    {digit}
                  </Text>
                </View>
              );
            })}
          </View>

          <TextInput
            ref={input}
            value={code}
            onChangeText={(v) => setCode(sanitizeOtp(v, OTP_LENGTH))}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            editable={!verifying}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            caretHidden
            accessibilityLabel="Doğrulama kodu"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0,
              // Keeping the text off-colour as well as transparent means a
              // platform that ignores opacity on inputs still shows nothing.
              color: 'transparent',
            }}
          />
        </Pressable>

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
    </KeyboardAvoidingView>
  );
}
