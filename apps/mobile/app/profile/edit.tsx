// Profile edit — Plan 8 Phase F2.
//
// Ports the design bundle's `ProfileEdit` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile-edit.jsx
// `function ProfileEdit(...)`) to React Native + NativeWind.
//
// Fields: avatar w/ camera badge → Ad Soyad · Zamir (seg) · Bölüm · Sınıf +
// Dominant el (seg) · Tenis seviyesi (seg) · Müsaitlik (6 slot grid).
//
// TODO(plan-8-F-polish): wire to use-update-profile mutation + supabase
// auth identity; keeps local UI state for the design pass.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Field } from '../../components/ui/Field';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Segmented } from '../../components/ui/Segmented';
import { Icon } from '../../components/ui/Icon';
import { useAuthStore } from '../../stores/auth-store';
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

export default function ProfileEdit() {
  const profile = useAuthStore((s) => s.profile);
  const extras = profile as
    | (NonNullable<typeof profile> & {
        pronoun?: string;
        dominantHand?: string;
        skillLevel?: string;
        departmentName?: string;
        classYear?: string | number;
      })
    | null;

  const [pronoun, setPronoun] = useState<Pronoun>(
    (extras?.pronoun as Pronoun) ?? 'they/them',
  );
  const [hand, setHand] = useState<'sag' | 'sol'>(
    (extras?.dominantHand as 'sag' | 'sol') ?? 'sag',
  );
  const [level, setLevel] = useState<'baslangic' | 'orta' | 'ileri'>(
    (extras?.skillLevel as 'baslangic' | 'orta' | 'ileri') ?? 'orta',
  );
  const [avail, setAvail] = useState<string[]>(['wd_eve', 'we_am']);

  const toggle = (k: string) =>
    setAvail((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const name = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : 'Oyuncu';
  const dept = extras?.departmentName ?? '';
  const year = extras?.classYear ?? '';

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
            <Avatar name={name} size={92} />
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
              <Icon name="camera" size={15} color="#FFFFFF" stroke={2.2} />
            </View>
          </View>
          <Pressable>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.court }}
            >
              Fotoğrafı değiştir
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 18 }}>
          <Field label="Ad Soyad" value={name} />

          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              ZAMİR
            </Text>
            <Segmented
              value={pronoun}
              onChange={setPronoun}
              options={PRONOUNS.map((p) => ({ value: p, label: p }))}
            />
          </View>

          <Field
            label="Bölüm"
            value={dept}
            icon="search"
            suffix="değiştir"
          />

          <View className="flex-row" style={{ gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
              >
                SINIF
              </Text>
              <Field value={year ? `${year}. sınıf` : ''} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
              >
                DOMİNANT EL
              </Text>
              <Segmented
                value={hand}
                onChange={setHand}
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
              onChange={setLevel}
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
        <Button full size="lg" onPress={() => router.back()}>
          Kaydet
        </Button>
      </View>
    </View>
  );
}
