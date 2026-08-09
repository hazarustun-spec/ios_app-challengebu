// Sign-in (email) screen — Plan 8 Phase D3.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx
// `function EmailScreen()` lines 51-75.
//
// User enters a BÜ-eligible e-mail, accepts the KVKK + privacy notice, then
// taps "Kod gönder" — Supabase sends a magic-link + 6-digit OTP and we route
// to /(auth)/otp with the email param for verification.

import { getOtpOptions } from '@tennis/shared';
import {
  BOUN_EMAIL_ERROR_TR,
  REVIEW_FIXED_CODE,
  isReviewEmail,
  validateBouniMail,
} from '@tennis/shared/schemas';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Field } from '../../components/ui/Field';
import { NavHeader } from '../../components/ui/NavHeader';
import { LEGAL_URLS } from '../../lib/legal';
import { reviewLogin } from '../../lib/review-auth';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

const QUICK_DOMAINS = ['@std.bogazici.edu.tr', '@bogazici.edu.tr', '@alumni.bogazici.edu.tr'];

export default function SignIn() {
  const setSession = useAuthStore((s) => s.setSession);
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
    setSending(true);
    try {
      // Demo account: nothing is mailed (the mailbox is not readable by whoever
      // is reviewing), and the fixed code is already in the bundle, so sign in
      // right here. The OTP screen — six cells, a hidden input and a keyboard
      // that has to come up on an iPad running the app in iPhone compatibility
      // mode — is the most environment-sensitive screen in the app, and this is
      // the one account that has no reason to go through it.
      if (isReviewEmail(trimmed)) {
        const session = await reviewLogin(trimmed, REVIEW_FIXED_CODE);
        setSession(session);
        router.replace('/');
        return;
      }
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
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bir sorun oluştu.');
    } finally {
      setSending(false);
    }
  };

  return (
    // The field autofocuses, so the keyboard is up before the user can read the
    // screen. Without this the KVKK checkbox sits half under the keyboard and
    // the footer "Kod gönder" button is hidden entirely — the whole screen has
    // to lift, since the button lives outside the ScrollView and cannot be
    // scrolled into view.
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <NavHeader
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
          Sana giriş bağlantısı ve 6 haneli kod göndereceğiz. Sadece üniversite hesapları kabul
          edilir.
        </Text>

        <Field
          icon="mail"
          type="email"
          placeholder="Öğrenci ya da mezun e-postan"
          value={email}
          onChange={setEmail}
          autoFocus
          big
          // Deliberately not `error`: an address from outside the university is
          // the membership rule doing its job, not a failure to fix. Red styling
          // reads as a broken app to anyone who tries their own address first.
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
              onPress={() => setEmail((cur) => (cur.split('@')[0] || 'ad.soyad') + d)}
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

        {/* Dev-only component gallery link — preserved from previous sign-in. */}
        {__DEV__ && (
          <Pressable
            onPress={() => router.push('/(dev)/gallery' as never)}
            style={{ alignSelf: 'center', marginTop: 24, padding: 8 }}
          >
            <Text className="font-sans font-semibold text-text-3" style={{ fontSize: 13 }}>
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
            <Text className="font-sans font-semibold text-text-3" style={{ fontSize: 13 }}>
              Onboarding wizard (dev)
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Consent + CTA share the footer: the button is disabled until the box
          is ticked, so the two have to be on screen together. Keeping the
          consent up in the ScrollView left it scrolled out of sight behind the
          keyboard, next to a button that looked permanently dead. */}
      <View style={{ padding: 24, paddingTop: 8, gap: 14 }}>
        {/* KVKK + privacy consent — the checkbox is its own control so tapping
            it toggles, while the inline links open their legal pages. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Pressable
            onPress={() => setKvkkAccepted((v) => !v)}
            style={{ marginTop: 1, paddingVertical: 4, paddingRight: 4 }}
            accessibilityRole="checkbox"
            accessibilityLabel="KVKK onayı"
            accessibilityState={{ checked: kvkkAccepted }}
          >
            <CheckBox checked={kvkkAccepted} onChange={setKvkkAccepted} />
          </Pressable>
          <Text className="font-sans flex-1 text-text-2" style={{ fontSize: 13, lineHeight: 19 }}>
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
    </KeyboardAvoidingView>
  );
}
