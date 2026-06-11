// Settings root — Plan 8 Phase G2.
//
// Ports the design source's `Settings` screen (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function Settings(...)`) to React Native + Expo Router.
//
// Composition:
//   - Sectioned `ListRow` cards: Bildirimler / Hesap / Diğer / (destructive)
//   - Top-level "Push bildirimleri" toggle is a master switch; granular
//     8-category control lives at /settings/notification-preferences.
//   - Admin row appears only when the auth store's profile.role === 'admin'.
//   - Destructive group: "Çıkış yap" → useSignOut; "Hesabı sil" →
//     /settings/delete-account 2-step flow.
//
// TODO(plan-8-G-polish): wire the master push toggle to the device-level
// permissions state once we have a `usePushPermission` hook. Today the
// row is a static `true` so the design doesn't ship with a missing thumb.

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { ListRow } from '../../components/ui/ListRow';
import { Toggle } from '../../components/ui/Toggle';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

const APP_VERSION = '1.0.0';

export default function Settings() {
  const signOut = useSignOut();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Ayarlar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 24 }}>
        <Section label="Bildirimler">
          <ListRow
            icon="bell"
            title="Push bildirimleri"
            subtitle="Tüm bildirimler"
            right={<Toggle value={true} onChange={() => {}} />}
          />
          <Divider />
          <ListRow
            icon="list"
            title="Bildirim tercihleri"
            subtitle="8 kategori"
            chevron
            onPress={() =>
              router.push('/settings/notification-preferences' as never)
            }
          />
        </Section>

        <Section label="Hesap">
          <ListRow
            icon="user"
            title="Profili düzenle"
            chevron
            onPress={() => router.push('/profile/edit' as never)}
          />
          <Divider />
          <ListRow
            icon="ranking"
            title="Yarışma kategorisi"
            subtitle="Erkek · değiştir"
            chevron
            onPress={() => {}}
          />
          <Divider />
          <ListRow
            icon="eye"
            title="Gizlilik"
            subtitle="Bölüm, sınıf görünürlüğü"
            chevron
            onPress={() => {}}
          />
        </Section>

        <Section label="Diğer">
          <ListRow icon="info" title="Hakkında & kurallar" chevron onPress={() => {}} />
          {isAdmin && (
            <>
              <Divider />
              <ListRow
                icon="shield"
                title="Admin paneli"
                subtitle="Yalnızca yöneticiler"
                chevron
                onPress={() => router.push('/(admin)' as never)}
              />
            </>
          )}
        </Section>

        <Section>
          <ListRow icon="swap" title="Çıkış yap" onPress={() => signOut.mutate()} />
          <Divider />
          <ListRow
            icon="trash"
            title="Hesabı sil"
            danger
            onPress={() => router.push('/settings/delete-account' as never)}
          />
        </Section>

        <Text
          className="font-num text-text-3"
          style={{ fontSize: 11.5, textAlign: 'center', marginTop: 8 }}
        >
          Tennis Challenger · v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 11, letterSpacing: 0.66, paddingLeft: 16 }}
        >
          {label.toUpperCase()}
        </Text>
      )}
      <View
        className="bg-surface rounded-lg overflow-hidden"
        style={{ borderWidth: 1, borderColor: colors.borderStrong }}
      >
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.surface3 }} />;
}
