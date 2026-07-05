// Sign-in (email) screen — Plan 8 Phase D3.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function EmailScreen()` lines 51-75.
//
// User enters a BÜ-eligible e-mail, accepts the KVKK + privacy notice, then
// taps "Kod gönder" — Supabase sends a magic-link + 6-digit OTP and we route
// to /(auth)/otp with the email param for verification.

import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  BOUN_EMAIL_ERROR_TR,
  isReviewEmail,
  validateBouniMail,
} from '@tennis/shared/schemas';
import { getOtpOptions } from '@tennis/shared';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Field } from '../../components/ui/Field';
import { NavHeader } from '../../components/ui/NavHeader';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { LEGAL_URLS } from '../../lib/legal';

const QUICK_DOMAINS = [
  '@std.bogazici.edu.tr',
  '@bogazici.edu.tr',
  '@alumni.bogazici.edu.tr',
];

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [sending, setSending] = useState(false);

  const trimmed = email.trim();
  const dirty = trimmed.length > 3;
  const valid = validateBouniMail(trimmed);
  const isReview = isReviewEmail(trimmed);
  const canSubmit = valid && kvkkAccepted && !sending;

  const handleSend = async () => {
    if (!canSubmit) return;
    // App Store review account: no mail is sent (the reviewer can't read the
    // mailbox). Skip straight to the OTP screen, which collects the fixed review
    // code and authenticates via the review-login function.
    if (isReviewEmail(trimmed)) {
      router.push({ pathname: '/(auth)/otp', params: { email: trimmed } });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: getOtpOptions({ email: trimmed, withMagicLink: true }),
      });
      if (error) throw error;
      router.push({
        pathname: '/(auth)/otp',
        params: { email: trimmed },
      });
    } catch (err) {
      Alert.alert(
        'Hata',
        err instanceof Error ? err.message : 'Bir sorun oluştu.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')
        }
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="font-display font-extrabold text-text"
          style={{
            fontSize: 27,
            marginTop: 8,
            marginBottom: 8,
            letterSpacing: -0.54,
          }}
        >
          E-postanı gir
        </Text>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 15, lineHeight: 23, marginBottom: 28 }}
        >
          Sana giriş bağlantısı ve 6 haneli kod göndereceğiz. Sadece üniversite
          hesapları kabul edilir.
        </Text>

        <Field
          icon="mail"
          type="email"
          placeholder="ad.soyad@std.bogazici.edu.tr"
          value={email}
          onChange={setEmail}
          autoFocus
          big
          error={dirty && !valid}
          hint={
            dirty && !valid
              ? BOUN_EMAIL_ERROR_TR
              : 'Öğrenci, akademisyen, emekli ve mezun hesapları kabul edilir.'
          }
        />

        <View
          style={{
            marginTop: 18,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {QUICK_DOMAINS.map((d) => (
            <Pressable
              key={d}
              onPress={() =>
                setEmail((cur) => (cur.split('@')[0] || 'ad.soyad') + d)
              }
              style={{
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: colors.claySofter,
                borderWidth: 1,
                borderColor: colors.claySoft,
              }}
              accessibilityRole="button"
            >
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 12.5, color: colors.clayText }}
              >
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        {isReview && valid && (
          <Text
            className="font-sans text-text-2"
            style={{
              fontSize: 13,
              lineHeight: 19,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            App Review hesabı: e-postayı gir, KVKK onayla, ardından OTP ekranında
            App Store Connect notlarındaki 6 haneli kodu kullan (şifre alanı yok).
          </Text>
        )}

        {/* KVKK + privacy consent — the checkbox is its own control so tapping
            it toggles, while the inline links open their legal pages. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 32,
          }}
        >
          <Pressable
            onPress={() => setKvkkAccepted((v) => !v)}
            style={{ marginTop: 1, paddingVertical: 4, paddingRight: 4 }}
            accessibilityRole="checkbox"
            accessibilityLabel="KVKK onayı"
            accessibilityState={{ checked: kvkkAccepted }}
          >
            <CheckBox checked={kvkkAccepted} onChange={setKvkkAccepted} />
          </Pressable>
          <Text
            className="font-sans flex-1 text-text-2"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            <Text
              className="font-bold"
              style={{ color: colors.court, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(LEGAL_URLS.kvkk)}
              accessibilityRole="link"
            >
              KVKK Aydınlatma Metni
            </Text>{' '}
            ve{' '}
            <Text
              className="font-bold"
              style={{ color: colors.court, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
              accessibilityRole="link"
            >
              Gizlilik Politikası
            </Text>
            {"'nı"} okudum, kabul ediyorum.
          </Text>
        </View>

        {/* Dev-only component gallery link — preserved from previous sign-in. */}
        {__DEV__ && (
          <Pressable
            onPress={() => router.push('/(dev)/gallery' as never)}
            style={{ alignSelf: 'center', marginTop: 24, padding: 8 }}
          >
            <Text
              className="font-sans font-semibold text-text-3"
              style={{ fontSize: 13 }}
            >
              Component Gallery (dev)
            </Text>
          </Pressable>
        )}

        {/* Dev-only onboarding wizard jump — Plan 8 Phase D5-D14 visual QA. */}
        {__DEV__ && (
          <Pressable
            onPress={() => router.push('/(onboarding)/name')}
            style={{ alignSelf: 'center', marginTop: 4, padding: 8 }}
          >
            <Text
              className="font-sans font-semibold text-text-3"
              style={{ fontSize: 13 }}
            >
              Onboarding wizard (dev)
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ padding: 24, paddingTop: 8 }}>
        <Button
          full
          size="lg"
          disabled={!valid || !kvkkAccepted}
          loading={sending}
          onPress={handleSend}
        >
          {sending ? 'Gönderiliyor…' : isReview ? 'Devam et' : 'Kod gönder'}
        </Button>
      </View>
    </View>
  );
}
