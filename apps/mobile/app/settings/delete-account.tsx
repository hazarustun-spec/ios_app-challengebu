// Delete account — Plan 8 Phase G4.
//
// Ports the design source's `DeleteAccount` 2-step flow (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function DeleteAccount(...)`).
//
// Step 1 — warning + 3 bullet outcomes (profile/badges deleted; match history
// kept anonymized as "Silinmiş Oyuncu" for ladder integrity).
// Step 2 — type-to-confirm gate: user must type SİL (or SIL — Turkish layout
// with no dotted i). Only then the danger button enables.
//
// Confirming calls useDeleteAccount() → the `anonymize-account` Edge Function
// (scrubs the profile in place, drops push tokens, revokes sessions) then
// clears the local session and redirects to /(auth)/welcome. Satisfies Apple
// guideline 5.1.1(v) (in-app account deletion).

import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useDeleteAccount } from '../../hooks/use-delete-account';
import { colors } from '../../theme/colors';

export default function DeleteAccount() {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirm, setConfirm] = useState('');
  const deleteAccount = useDeleteAccount();

  if (step === 1) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Hesabı Sil" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              backgroundColor: `${colors.loss}1F`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="warn" size={30} color={colors.loss} />
          </View>

          <Text
            className="font-display font-extrabold text-text"
            style={{ fontSize: 23, letterSpacing: -0.46 }}
          >
            Emin misin?
          </Text>
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 15, lineHeight: 24 }}
          >
            Hesabını silmek geri alınamaz. Ancak{' '}
            <Text className="font-bold">
              maç geçmişin ve ELO kayıtların sıralama bütünlüğü için
              anonimleştirilerek korunur
            </Text>
            {' '}("Silinmiş Oyuncu" olarak).
          </Text>

          <View style={{ gap: 10 }}>
            {(
              [
                ['Profilin ve kişisel verilerin silinir', 'xCircle' as IconName, colors.loss],
                ['Rozetlerin ve vitrinin kaldırılır', 'xCircle' as IconName, colors.loss],
                ['Geçmiş maçların anonim olarak kalır', 'info' as IconName, colors.info],
              ] as const
            ).map(([t, ic, c]) => (
              <View key={t} className="flex-row items-center" style={{ gap: 10 }}>
                <Icon name={ic} size={18} color={c} />
                <Text
                  className="font-sans text-text-2"
                  style={{ fontSize: 13.5 }}
                >
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ padding: 20, gap: 10 }}>
          <Button full size="lg" variant="secondary" onPress={() => router.back()}>
            Vazgeç
          </Button>
          <Button full size="lg" variant="danger" onPress={() => setStep(2)}>
            Devam et
          </Button>
        </View>
      </View>
    );
  }

  // Step 2: type-to-confirm
  const normalized = confirm.trim().toUpperCase();
  const canDelete = normalized === 'SİL' || normalized === 'SIL';

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Son onay" onBack={() => setStep(1)} />
      <ScrollView contentContainerStyle={{ padding: 22, gap: 20 }}>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 15, lineHeight: 24 }}
        >
          Onaylamak için aşağıya{' '}
          <Text className="font-bold text-text">SİL</Text>
          {' '}yaz.
        </Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          placeholder="SİL"
          placeholderTextColor={colors.text3}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            width: '100%',
            height: 56,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: 4,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: 'SpaceGrotesk-ExtraBold',
          }}
        />
      </ScrollView>

      <View style={{ padding: 22 }}>
        <Button
          full
          size="lg"
          variant="danger"
          disabled={!canDelete || deleteAccount.isPending}
          icon={
            deleteAccount.isPending ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : undefined
          }
          onPress={() => {
            if (deleteAccount.isPending) return;
            deleteAccount.mutate(undefined, {
              onSuccess: () => router.replace('/(auth)/welcome' as never),
              onError: (err: unknown) => {
                const msg =
                  err instanceof Error
                    ? err.message
                    : 'Hesap silinemedi. Lütfen tekrar dene.';
                Alert.alert('Hesap silinemedi', msg);
              },
            });
          }}
        >
          {deleteAccount.isPending ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
        </Button>
      </View>
    </View>
  );
}
