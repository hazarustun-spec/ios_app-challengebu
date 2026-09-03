// Suspended-account terminal screen.
//
// Reached only when `profile.status` is `suspended` or `banned`. Every write
// on those accounts is rejected by RLS, so leaving them in the normal tab
// UI produced a stream of generic "Bunu yapma yetkin yok" alerts as the app
// tried to read personalised feeds. This screen is the single dead-end the
// AppGuards route them to instead — an explicit message plus a sign-out CTA.

import { View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useAuthStore } from '../stores/auth-store';
import { useSignOut } from '../hooks/use-sign-out';
import { colors } from '../theme/colors';

export default function SuspendedScreen() {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.profile?.status ?? null);
  const signOut = useSignOut();

  const isBanned = status === 'banned';
  const title = isBanned ? 'Hesabın kapatıldı' : 'Hesabın askıya alındı';
  const body = isBanned
    ? 'Bu hesap uygunluk kurallarımızı ihlâl ettiği için kapatıldı. Sorular için destek ekibiyle iletişime geçebilirsin.'
    : 'Bu hesap geçici olarak askıya alındı. Askı kalkana kadar uygulamayı kullanamazsın. Detay için destek ekibiyle iletişime geçebilirsin.';

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 24 + insets.top,
        paddingHorizontal: 20,
        paddingBottom: 24 + insets.bottom,
      }}
    >
      <View className="flex-1 items-center justify-center" style={{ gap: 18 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: `${colors.loss}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="ban" size={34} color={colors.loss} />
        </View>
        <Text
          className="font-display font-extrabold text-text"
          style={{ fontSize: 26, textAlign: 'center' }}
        >
          {title}
        </Text>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}
        >
          {body}
        </Text>
      </View>

      <Button
        full
        size="lg"
        variant="dark"
        onPress={() => signOut.mutate()}
        disabled={signOut.isPending}
        icon={signOut.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : undefined}
      >
        Çıkış yap
      </Button>
    </View>
  );
}
