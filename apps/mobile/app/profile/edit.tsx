// Profile edit — Plan 8 Phase F2, wired to live data.
//
// Fields: avatar w/ camera badge → Ad Soyad · Zamir (seg) ·
// Yarışma kategorisi (PickList) · Bölüm (sheet picker) + show toggle ·
// Sınıf (pill grid) + show toggle · Dominant el (seg) ·
// Tenis seviyesi (seg) · Müsaitlik (6 slot grid).
//
// Live data: useMyProfile() for prefill; useUpdateProfile() to save;
// useUploadAvatar() + pickAvatar() for avatar replacement.

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
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
import { Sheet } from '../../components/ui/Sheet';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { PickList } from '../../components/onboarding/PickList';
import { pickAvatar } from '../../components/profile/AvatarPicker';
import { useMyProfile } from '../../hooks/use-profile';
import { useUpdateProfile, type UpdateProfileInput } from '../../hooks/use-update-profile';
import { useUploadAvatar } from '../../hooks/use-upload-avatar';
import {
  useDepartments,
  type Department,
  type ProgramLevel,
} from '../../hooks/use-departments';
import { colors } from '../../theme/colors';
import { userMessage } from '../../lib/user-message';

const PRONOUNS = ['he/him', 'she/her', 'they/them'] as const;
type Pronoun = (typeof PRONOUNS)[number];

type GenderCategory = NonNullable<UpdateProfileInput['gender_category']>;

const SLOTS: { key: string; label: string }[] = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_noon', label: 'Hafta içi öğlen' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_noon', label: 'Hafta sonu öğlen' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];

const YEARS: { value: UpdateProfileInput['class_year']; label: string }[] = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: 'yl', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
  { value: 'mezun', label: 'Mezun' },
];

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

  // New editable fields
  const [category, setCategory] = useState<GenderCategory>('open_only');
  const [classYear, setClassYear] = useState<UpdateProfileInput['class_year']>('1');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [showDepartment, setShowDepartment] = useState(true);
  const [showClassYear, setShowClassYear] = useState(true);

  // Department sheet state
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [deptQ, setDeptQ] = useState('');

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
    setCategory(profile.gender_category ?? 'open_only');
    setClassYear(profile.class_year ?? '1');
    setDepartmentId(profile.department_id ?? null);
    setDepartmentName(profile.departments?.name ?? '');
    setShowDepartment(profile.show_department ?? true);
    setShowClassYear(profile.show_class_year ?? true);
  }, [profile]);

  // programLevel: lisansustu for yl/doktora, lisans for everything else,
  // unfiltered (both) for mezun. Matches app/(onboarding)/department.tsx.
  const programLevel: ProgramLevel | undefined =
    classYear == null || classYear === 'mezun'
      ? undefined
      : classYear === 'yl' || classYear === 'doktora'
        ? 'lisansustu'
        : 'lisans';

  const { data: deps } = useDepartments(programLevel);

  // Group + filter departments for the SectionList.
  const deptSections = useMemo(() => {
    const filtered = (deps ?? []).filter((d) =>
      d.name.toLowerCase().includes(deptQ.toLowerCase()),
    );
    const byFaculty = new Map<string, Department[]>();
    for (const d of filtered) {
      const key = d.faculty ?? 'Diğer';
      if (!byFaculty.has(key)) byFaculty.set(key, []);
      byFaculty.get(key)!.push(d);
    }
    return Array.from(byFaculty.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [deps, deptQ]);

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
          Alert.alert('Hata', userMessage(err, 'Fotoğraf yüklenemedi.'));
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
      // This form only offers he/him, she/her and they/them (see the seeding
      // effect above), so the saved pronoun is never 'other' and there is no
      // custom text to carry. It used to preserve profile.pronoun_custom for
      // 'they/them', which kept a stale string alive on a pronoun that never
      // reads it.
      pronoun_custom: null,
      department_id: departmentId,
      show_department: showDepartment,
      class_year: classYear,
      show_class_year: showClassYear,
      skill_self_assessment: level,
      dominant_hand: hand,
      availability_windows: avail,
      gender_category: category,
    };
    updateProfile.mutate(input, {
      onSuccess: () => router.back(),
      onError: (err) => {
        Alert.alert('Hata', userMessage(err, 'Kaydedilemedi.'));
      },
    });
  };

  const name =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Oyuncu';

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
          {/* Ad + Soyad are two separate fields — the previous single "Ad Soyad"
              input tried to split the string on whitespace on every keystroke,
              which mangled multi-word names ("Emre Can Aydın" → first="Emre",
              last="Can Aydın") and re-split as the user typed. */}
          <Field
            label="Ad"
            value={firstName}
            onChange={setFirstName}
          />
          <Field
            label="Soyad"
            value={lastName}
            onChange={setLastName}
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

          {/* Yarışma kategorisi */}
          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              YARIŞMA KATEGORİSİ
            </Text>
            <PickList<GenderCategory>
              value={category}
              onPick={setCategory}
              options={[
                {
                  value: 'erkek',
                  label: 'Erkek',
                  icon: 'user',
                  desc: 'Erkek Tek + Open Tek sıralamalarında yer alırsın.',
                },
                {
                  value: 'kadin',
                  label: 'Kadın',
                  icon: 'user',
                  desc: 'Kadın Tek + Open Tek sıralamalarında yer alırsın.',
                },
                {
                  value: 'open_only',
                  label: 'Sadece Open',
                  icon: 'ranking',
                  desc: 'Yalnızca Open Tek sıralamasında yer alırsın.',
                },
              ]}
            />
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                gap: 10,
                padding: 14,
                backgroundColor: colors.surface2,
                borderRadius: 18,
              }}
            >
              <Icon name="info" size={18} color={colors.info} />
              <Text
                className="font-sans text-text-2"
                style={{ fontSize: 13, lineHeight: 19, flex: 1 }}
              >
                Bu seçim sıralama uygunluğunu etkiler.
              </Text>
            </View>
          </View>

          {/* Bölüm picker */}
          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              BÖLÜM
            </Text>
            <Pressable
              onPress={() => setDeptSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Bölüm seç"
              style={{
                width: '100%',
                height: 58,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
              }}
            >
              <Icon name="list" size={20} color={colors.text3} />
              <Text
                className="font-sans"
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: departmentName ? '600' : '500',
                  color: departmentName ? colors.text : colors.text3,
                }}
                numberOfLines={1}
              >
                {departmentName || 'Bölüm seç'}
              </Text>
              <Icon name="chevD" size={20} color={colors.text3} />
            </Pressable>
            <Pressable
              onPress={() => setShowDepartment(!showDepartment)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: 14,
                paddingVertical: 6,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 14.5 }}
                >
                  Bölümü profilimde göster
                </Text>
                <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
                  Diğer oyuncular bölümünü görebilir
                </Text>
              </View>
              <Toggle value={showDepartment} onChange={setShowDepartment} />
            </Pressable>
          </View>

          {/* Sınıf picker */}
          <View>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, marginBottom: 9 }}
            >
              SINIF
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {YEARS.map((y) => {
                const on = classYear === y.value;
                return (
                  <Pressable
                    key={y.value}
                    onPress={() => setClassYear(y.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 9999,
                      borderWidth: 1.5,
                      borderColor: on ? colors.clay : colors.borderStrong,
                      backgroundColor: on ? colors.clay : colors.surface,
                    }}
                  >
                    <Text
                      className="font-sans font-bold"
                      style={{
                        fontSize: 15,
                        color: on ? '#FFFFFF' : colors.text,
                      }}
                    >
                      {y.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowClassYear(!showClassYear)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: 14,
                paddingVertical: 6,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 14.5 }}
                >
                  Sınıfı profilimde göster
                </Text>
              </View>
              <Toggle value={showClassYear} onChange={setShowClassYear} />
            </Pressable>
          </View>

          <View>
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
                { value: 'sol', label: 'Sol' },
                { value: 'sag', label: 'Sağ' },
              ]}
            />
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

      {/* Department picker sheet */}
      <Sheet
        visible={deptSheetOpen}
        onClose={() => {
          setDeptSheetOpen(false);
          setDeptQ('');
        }}
        title="Bölüm seç"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ height: 520 }}
        >
          <Field
            icon="search"
            placeholder="Bölüm ara…"
            value={deptQ}
            onChange={setDeptQ}
          />
          <SectionList
            style={{ marginTop: 12, flex: 1 }}
            sections={deptSections}
            keyExtractor={(d) => d.id}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={25}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  paddingTop: 16,
                  paddingBottom: 6,
                  paddingHorizontal: 6,
                  backgroundColor: colors.surface,
                }}
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item: d }) => (
              <Pressable
                onPress={() => {
                  setDepartmentId(d.id);
                  setDepartmentName(d.name);
                  setDeptSheetOpen(false);
                  setDeptQ('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 6,
                  borderBottomWidth: 1,
                  borderColor: colors.surface3,
                }}
              >
                <Text
                  className="font-sans font-semibold text-text"
                  style={{ fontSize: 15, flex: 1 }}
                >
                  {d.name}
                </Text>
                {departmentId === d.id && (
                  <Icon name="check" size={18} color={colors.clay} stroke={3} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                className="font-sans text-text-3"
                style={{
                  fontSize: 13,
                  textAlign: 'center',
                  paddingVertical: 24,
                }}
              >
                {deps === undefined ? 'Yükleniyor…' : 'Eşleşen bölüm yok'}
              </Text>
            }
          />
        </KeyboardAvoidingView>
      </Sheet>
    </View>
  );
}
