// Admin · Kullanıcı detayı — Plan 8 Phase G (G11/G12).
//
// Composition: profile hero card (avatar + name + meta), aksiyon ListRows
// (Askıya al / Banla / Aktif et / Admin yap or yetkisini al), and a
// bottom-sheet for the multi-duration suspend picker (3 gün / 7 gün /
// 30 gün / Sınırsız). The sheet wires straight into the existing
// `useAdminUpdateProfile` mutation with the Plan 8 Phase A4 `suspendedUntil`
// param — `null` for permanent ban, ISO timestamp for auto-expire.

import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NavHeader } from '../../../components/ui/NavHeader';
import { ListRow } from '../../../components/ui/ListRow';
import { Avatar } from '../../../components/ui/Avatar';
import { Sheet } from '../../../components/ui/Sheet';
import { Banner } from '../../../components/ui/Banner';
import { useAdminUpdateProfile } from '../../../hooks/use-admin-update-profile';
import { useAdminUserDetail } from '../../../hooks/use-admin-user-detail';
import { colors } from '../../../theme/colors';

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  banned: 'Banlı',
};

interface SuspendOption {
  key: string;
  label: string;
  /** Days until auto-expire. `null` = permanent ban (`suspended_until = null`). */
  days: number | null;
}

const SUSPEND_OPTIONS: SuspendOption[] = [
  { key: '3d', label: '3 gün', days: 3 },
  { key: '7d', label: '7 gün', days: 7 },
  { key: '30d', label: '30 gün', days: 30 },
  { key: 'inf', label: 'Sınırsız (permanent ban)', days: null },
];

export default function AdminUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const detail = useAdminUserDetail(userId);
  const update = useAdminUpdateProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (detail.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Kullanıcı" onBack={() => router.back()} />
        <View
          className="flex-1 items-center justify-center"
          style={{ padding: 24 }}
        >
          <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
            Yükleniyor…
          </Text>
        </View>
      </View>
    );
  }

  const u = detail.data;
  if (!u) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Kullanıcı" onBack={() => router.back()} />
        <View
          className="flex-1 items-center justify-center"
          style={{ padding: 24 }}
        >
          <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
            Kullanıcı bulunamadı.
          </Text>
        </View>
      </View>
    );
  }

  const fullName = `${u.first_name} ${u.last_name}`.trim();
  const isActive = u.status === 'active' || u.status === null;
  const isSuspended = u.status === 'suspended';
  const isBanned = u.status === 'banned';

  const apply = (
    label: string,
    patch: {
      role?: 'player' | 'admin';
      status?: 'active' | 'suspended' | 'banned';
      suspendedUntil?: string | null;
    },
  ) => {
    Alert.alert(`${label} uygulanacak`, 'Devam etmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () =>
          update.mutate(
            { targetUserId: u.user_id, ...patch },
            {
              onError: (e) =>
                Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız'),
            },
          ),
      },
    ]);
  };

  const pickSuspend = (opt: SuspendOption) => {
    setSheetOpen(false);
    const suspendedUntil =
      opt.days === null
        ? null
        : new Date(Date.now() + opt.days * 24 * 60 * 60 * 1000).toISOString();
    apply(`Askıya al (${opt.label})`, {
      status: 'suspended',
      suspendedUntil,
    });
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Kullanıcı" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        {/* Hero */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 18,
          }}
        >
          <Avatar name={fullName} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              className="font-display font-extrabold text-text"
              style={{ fontSize: 18 }}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12.5, marginTop: 2 }}
              numberOfLines={1}
            >
              {u.email ?? '—'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                flexWrap: 'wrap',
              }}
            >
              <StatusPill status={u.status} />
              {u.role === 'admin' && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: colors.text,
                  }}
                >
                  <Text
                    className="font-sans font-extrabold"
                    style={{ fontSize: 10, color: colors.bg, letterSpacing: 0.6 }}
                  >
                    ADMIN
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Active suspension banner */}
        {isSuspended && u.suspended_until && (
          <Banner
            tone="warning"
            title="Aktif askıya alma"
            body={`Otomatik aktifleşme: ${new Date(u.suspended_until).toLocaleString('tr-TR')}`}
          />
        )}
        {isSuspended && !u.suspended_until && (
          <Banner
            tone="error"
            title="Permanent ban"
            body="Süresiz askıya alındı. Cron otomatik aktifleştirmez."
          />
        )}

        {/* Meta */}
        <SectionCard>
          <Meta label="Telefon" value={u.phone ?? '—'} />
          <Divider />
          <Meta label="Kategori" value={u.gender_category ?? '—'} />
          <Divider />
          <Meta
            label="Son maç"
            value={
              u.last_match_at
                ? new Date(u.last_match_at).toLocaleDateString('tr-TR')
                : '—'
            }
          />
          <Divider />
          <Meta
            label="Kayıt"
            value={new Date(u.created_at).toLocaleDateString('tr-TR')}
          />
        </SectionCard>

        {/* Actions */}
        <SectionCard>
          {!isSuspended && (
            <>
              <ListRow
                icon="clock"
                iconColor={colors.warn}
                title="Askıya al"
                subtitle="Süre seç…"
                chevron
                onPress={() => setSheetOpen(true)}
              />
              <Divider />
            </>
          )}
          {!isBanned && (
            <>
              <ListRow
                icon="ban"
                title="Banla (permanent)"
                danger
                onPress={() =>
                  apply('Banla', {
                    status: 'banned',
                    suspendedUntil: null,
                  })
                }
              />
              <Divider />
            </>
          )}
          {!isActive && (
            <>
              <ListRow
                icon="check"
                iconColor={colors.win}
                title="Geri aktif et"
                onPress={() =>
                  apply('Aktif et', {
                    status: 'active',
                    suspendedUntil: null,
                  })
                }
              />
              <Divider />
            </>
          )}
          {u.role === 'player' ? (
            <ListRow
              icon="shield"
              title="Admin yap"
              onPress={() => apply('Admin ata', { role: 'admin' })}
            />
          ) : (
            <ListRow
              icon="shield"
              title="Admin yetkisini al"
              onPress={() => apply('Admin yetkisini al', { role: 'player' })}
            />
          )}
        </SectionCard>
      </ScrollView>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Askıya alma süresi"
      >
        <View style={{ gap: 4 }}>
          {SUSPEND_OPTIONS.map((opt) => (
            <ListRow
              key={opt.key}
              icon={opt.days === null ? 'ban' : 'clock'}
              iconColor={opt.days === null ? colors.loss : colors.warn}
              title={opt.label}
              subtitle={
                opt.days === null
                  ? 'Cron otomatik aktifleştirmez'
                  : `${new Date(Date.now() + opt.days * 86400000).toLocaleDateString('tr-TR')} sonunda aktif olur`
              }
              chevron
              danger={opt.days === null}
              onPress={() => pickSuspend(opt)}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="bg-surface rounded-lg overflow-hidden"
      style={{ borderWidth: 1, borderColor: colors.borderStrong }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.surface3 }} />;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text
        className="font-sans text-text-3"
        style={{ fontSize: 12.5 }}
      >
        {label}
      </Text>
      <Text
        className="font-sans font-semibold text-text"
        style={{ fontSize: 13, flexShrink: 1, textAlign: 'right' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const label = status ? STATUS_LABEL[status] ?? status : 'Aktif';
  const tone =
    status === 'banned'
      ? { bg: '#FCE6E4', color: colors.loss }
      : status === 'suspended'
        ? { bg: colors.warnSoft, color: colors.warn }
        : { bg: colors.limeSoft, color: colors.lvCaylak };
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: tone.bg,
      }}
    >
      <Text
        className="font-sans font-extrabold"
        style={{ fontSize: 10, color: tone.color, letterSpacing: 0.4 }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
