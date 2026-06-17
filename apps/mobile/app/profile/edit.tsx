// Profile edit — Plan 8 Phase F2, wired to live data.
//
// Fields: avatar w/ camera badge → Ad Soyad · Zamir (seg) · Bölüm · Sınıf +
// Dominant el (seg) · Tenis seviyesi (seg) · Müsaitlik (6 slot grid).
//
// Live data: useMyProfile() for prefill; useUpdateProfile() to save;
// useUploadAvatar() + pickAvatar() for avatar replacement.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Field } from '../../components/ui/Field';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Segmented } from '../../components/ui/Segmented';
import { Icon } from '../../components/ui/Icon';
import { pickAvatar } from '../../components/profile/AvatarPicker';
import { useMyProfile } from '../../hooks/use-profile';
import { useUpdateProfile, type UpdateProfileInput } from '../../hooks/use-update-profile';
import { useUploadAvatar } from '../../hooks/use-upload-avatar';
import { colors } from '../../theme/colors';

const PRONOUNS = ['he/him', 'she/her', 'they/them'] as const;
type Pronoun = (typeof PRONOUNS)[number];

const SLOTS: { key: string; label: string }[] = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_noon', label: 'Hafta içi öğlen' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_noon', label: 'Hafta sonu öğlen' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];

/** Map DB class_year enum to a display string. */
function classYearLabel(year: UpdateProfileInput['class_year'] | null | undefined): string {
  if (!year) return '';
  const map: Record<UpdateProfileInput['class_year'], string> = {
    hazirlik: 'Hazırlık',
    '1': '1. sınıf',
    '2': '2. sınıf',
    '3': '3. sınıf',
    '4': '4. sınıf',
    yl: 'Yüksek Lisans',
    doktora: 'Doktora',
  };
  return map[year] ?? year;
}

export default function ProfileEdit() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  // Local avatar URI — set after a successful pick/upload so the preview
  // updates immediately without waiting for a query refetch.
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // Form state — seeded from live profile once loaded.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pronoun, setPronoun] = useState<Pronoun>('they/them');
  const [hand, setHand] = useState<'sag' | 'sol'>('sag');
  const [level, setLevel] = useState<'baslangic' | 'orta' | 'ileri'>('orta');
  const [avail, setAvail] = useState<string[]>([]);

  // Seed form fields when profile loads.
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    // Only 'he/him' | 'she/her' | 'they/them' are surfaced in this form;
    // 'other' falls back to 'they/them' since the UI has no custom field.
    const p = profile.pronoun;
    setPronoun(p === 'he/him' || p === 'she/her' ? p : 'they/them');
    setHand(profile.dominant_hand ?? 'sag');
    setLevel(profile.skill_self_assessment ?? 'orta');
    setAvail(profile.availability_windows ?? []);
  }, [profile]);

  const toggle = (k: string) =>
    setAvail((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const handlePickAvatar = async () => {
    const uri = await pickAvatar();
    if (!uri) return;
    uploadAvatar.mutate(
      { localUri: uri },
      {
        onSuccess: (res) => {
          if (res?.url) setLocalAvatarUri(res.url);
        },
        onError: (err) => {
          Alert.alert('Hata', err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.');
        },
      },
    );
  };

  const handleSave = () => {
    if (!profile) return;
    const input: UpdateProfileInput = {
      first_name: firstName.trim() || profile.first_name,
      last_name: lastName.trim() || profile.last_name,
      pronoun,
      pronoun_custom: pronoun === 'they/them' ? profile.pronoun_custom : null,
      department_id: profile.department_id,
      show_department: profile.show_department,
      class_year: profile.class_year,
      show_class_year: profile.show_class_year,
      skill_self_assessment: level,
      dominant_hand: hand,
      availability_windows: avail,
      gender_category: profile.gender_category,
    };
    updateProfile.mutate(input, {
      onSuccess: () => router.back(),
      onError: (err) => {
        Alert.alert('Hata', err instanceof Error ? err.message : 'Kaydedilemedi.');
      },
    });
  };

  const name =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Oyuncu';

  const deptName = profile?.departments?.name ?? '';
  const yearLabel = classYearLabel(profile?.class_year);

  // The resolved avatar URI: uploaded-in-session > profile avatar_url > initials.
  const avatarUri = localAvatarUri ?? profile?.avatar_url ?? undefined;

  const isBusy = updateProfile.isPending || uploadAvatar.isPending;

  // ---- Loading state ----
  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Profili düzenle" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  // ---- Error state ----
  if (isError || !profile) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Profili düzenle" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            Profil bilgileri yüklenemedi. Tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Profili düzenle" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 20,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            alignItems: 'center',
            gap: 10,
            paddingVertical: 20,
          }}
        >
          <View style={{ position: 'relative' }}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 92, height: 92, borderRadius: 46 }}
              />
            ) : (
              <Avatar name={name} size={92} />
            )}
            {uploadAvatar.isPending ? (
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.text,
                  borderWidth: 1.5,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <Pressable
                onPress={handlePickAvatar}
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.text,
                  borderWidth: 1.5,
                  borderColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="camera" size={15} color="#FFFFFF" stroke={2.2} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={handlePickAvatar} disabled={uploadAvatar.isPending}>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.court }}
            >
              Fotoğrafı değiştir
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 18 }}>
          <Field
            label="Ad Soyad"
            value={`${firstName} ${lastName}`.trim()}
            onChange={(v) => {
              const parts = v.trim().split(/\s+/);
              setFirstName(parts[0] ?? '');
              setLastName(parts.slice(1).join(' '));
            }}
          />

          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              ZAMİR
            </Text>
            <Segmented
              value={pronoun}
              onChange={(v) => setPronoun(v)}
              options={PRONOUNS.map((p) => ({ value: p, label: p }))}
            />
          </View>

          {deptName ? (
            <Field
              label="Bölüm"
              value={deptName}
              icon="search"
              suffix="değiştir"
            />
          ) : null}

          <View className="flex-row" style={{ gap: 14 }}>
            {yearLabel ? (
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-extrabold text-text-3"
                  style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
                >
                  SINIF
                </Text>
                <Field value={yearLabel} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
              >
                DOMİNANT EL
              </Text>
              <Segmented
                value={hand}
                onChange={(v) => setHand(v)}
                options={[
                  { value: 'sag', label: 'Sağ' },
                  { value: 'sol', label: 'Sol' },
                ]}
              />
            </View>
          </View>

          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              TENİS SEVİYESİ
            </Text>
            <Segmented
              value={level}
              onChange={(v) => setLevel(v)}
              options={[
                { value: 'baslangic', label: 'Başlangıç' },
                { value: 'orta', label: 'Orta' },
                { value: 'ileri', label: 'İleri' },
              ]}
            />
          </View>

          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              MÜSAİTLİK
            </Text>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
            >
              {SLOTS.map((s) => {
                const on = avail.includes(s.key);
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => toggle(s.key)}
                    className="flex-row items-center"
                    style={{
                      width: '48%',
                      padding: 12,
                      gap: 9,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: colors.borderStrong,
                      backgroundColor: on ? colors.limeSoft : colors.surface,
                    }}
                  >
                    <CheckBox checked={on} onChange={() => toggle(s.key)} />
                    <Text
                      className="font-sans font-bold text-text"
                      style={{ fontSize: 12.5 }}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          padding: 20,
          borderTopWidth: 1,
          borderColor: colors.borderStrong,
        }}
      >
        <Button full size="lg" onPress={handleSave} disabled={isBusy}>
          {updateProfile.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </View>
    </View>
  );
}
