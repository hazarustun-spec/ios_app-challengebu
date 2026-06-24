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
// The master "Push bildirimleri" toggle reflects the live OS notification
// permission (read on focus). iOS does not allow toggling push from inside
// the app, so flipping it opens the system Settings instead. Granular
// per-category control lives at /settings/notification-preferences.

import { useCallback, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { ListRow } from '../../components/ui/ListRow';
import { Toggle } from '../../components/ui/Toggle';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';
import { LEGAL_URLS } from '../../lib/legal';

const APP_VERSION = '1.0.0';

// Hosted legal pages (GitHub Pages) — wired for App Store legal compliance.
const RULES_URL = LEGAL_URLS.terms;

export default function Settings() {
  const signOut = useSignOut();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const [pushGranted, setPushGranted] = useState(false);

  // Reflect the real OS permission whenever the screen regains focus (e.g.
  // after the user returns from the system Settings app).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Notifications.getPermissionsAsync().then(({ status }) => {
        if (active) setPushGranted(status === 'granted');
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Ayarlar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 24 }}>
        <Section label="Bildirimler">
          <ListRow
            icon="bell"
            title="Push bildirimleri"
            subtitle={pushGranted ? 'Açık · sistem ayarları' : 'Kapalı · sistem ayarları'}
            right={<Toggle value={pushGranted} onChange={() => Linking.openSettings()} />}
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
            onPress={() => router.push('/profile/edit' as never)}
          />
          <Divider />
          <ListRow
            icon="eye"
            title="Gizlilik"
            subtitle="Bölüm, sınıf görünürlüğü"
            chevron
            onPress={() => router.push('/profile/edit' as never)}
          />
        </Section>

        <Section label="Diğer">
          <ListRow
            icon="info"
            title="Hakkında & kurallar"
            subtitle={`ChallengeBu! · v${APP_VERSION}`}
            chevron
            onPress={() => Linking.openURL(RULES_URL)}
          />
          <Divider />
          <ListRow
            icon="eye"
            title="Gizlilik Politikası"
            chevron
            onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
          />
          <Divider />
          <ListRow
            icon="info"
            title="KVKK Aydınlatma Metni"
            chevron
            onPress={() => Linking.openURL(LEGAL_URLS.kvkk)}
          />
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
          ChallengeBu! · v{APP_VERSION}
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
