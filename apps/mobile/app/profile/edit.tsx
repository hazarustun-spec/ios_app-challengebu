import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useUpdateProfile, type UpdateProfileInput } from '../../hooks/use-update-profile';
import { useMyProfile } from '../../hooks/use-profile';

const PRONOUN_OPTIONS = [
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'other', label: 'other' },
] as const;

const CLASS_OPTIONS = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: 'yl', label: 'YL' },
  { value: 'doktora', label: 'Doktora' },
] as const;

const SKILL_OPTIONS = [
  { value: 'baslangic', label: 'Başlangıç' },
  { value: 'orta', label: 'Orta' },
  { value: 'ileri', label: 'İleri' },
] as const;

const HAND_OPTIONS = [
  { value: 'sag', label: 'Sağ' },
  { value: 'sol', label: 'Sol' },
] as const;

const GENDER_OPTIONS = [
  { value: 'erkek', label: 'Erkek' },
  { value: 'kadin', label: 'Kadın' },
  { value: 'open_only', label: 'Sadece Open' },
] as const;

const AVAILABILITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekday_morning', label: 'Hafta içi sabah' },
  { value: 'weekday_noon', label: 'Hafta içi öğlen' },
  { value: 'weekday_evening', label: 'Hafta içi akşam' },
  { value: 'weekend_morning', label: 'Hafta sonu sabah' },
  { value: 'weekend_noon', label: 'Hafta sonu öğlen' },
  { value: 'weekend_evening', label: 'Hafta sonu akşam' },
];

export default function EditProfileScreen() {
  const { data: p, isLoading } = useMyProfile();
  const mutation = useUpdateProfile();
  const [form, setForm] = useState<UpdateProfileInput | null>(null);

  useEffect(() => {
    if (!p) return;
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      pronoun: p.pronoun,
      pronoun_custom: p.pronoun_custom ?? null,
      department_id: p.department_id ?? null,
      show_department: p.show_department,
      class_year: p.class_year,
      show_class_year: p.show_class_year,
      skill_self_assessment: p.skill_self_assessment,
      dominant_hand: p.dominant_hand,
      availability_windows: p.availability_windows ?? [],
      gender_category: p.gender_category,
    });
  }, [p]);

  if (isLoading || !form) {
    return (
      <ScreenContainer>
        <Text className="text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const update = <K extends keyof UpdateProfileInput>(key: K, value: UpdateProfileInput[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onChangeGender = (next: UpdateProfileInput['gender_category']) => {
    if (next === form.gender_category) return;
    Alert.alert(
      'Kategori değişikliği',
      "Yarışma kategorisini değiştirmek istediğinden emin misin? Yeni kategorideki ELO'n 1200'den başlar.",
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Değiştir', style: 'destructive', onPress: () => update('gender_category', next) },
      ],
    );
  };

  const onSave = async () => {
    try {
      await mutation.mutateAsync(form);
      router.back();
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    }
  };

  const toggleAvailability = (val: string) => {
    const next = form.availability_windows.includes(val)
      ? form.availability_windows.filter((v) => v !== val)
      : [...form.availability_windows, val];
    update('availability_windows', next);
  };

  return (
    <ScreenContainer scrollable>
      <TextField
        label="Ad"
        value={form.first_name}
        onChangeText={(v) => update('first_name', v)}
      />
      <TextField
        label="Soyad"
        value={form.last_name}
        onChangeText={(v) => update('last_name', v)}
      />

      <Text className="mb-1 text-sm font-medium text-gray-700">Pronoun</Text>
      <RadioGroup
        label=""
        options={PRONOUN_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.pronoun}
        onChange={(v) => update('pronoun', v as UpdateProfileInput['pronoun'])}
      />
      {form.pronoun === 'other' && (
        <TextField
          label="Özel"
          value={form.pronoun_custom ?? ''}
          onChangeText={(v) => update('pronoun_custom', v)}
        />
      )}

      <ToggleRow
        label="Bölümü profilde göster"
        value={form.show_department}
        onChange={(v) => update('show_department', v)}
      />
      <ToggleRow
        label="Sınıfı profilde göster"
        value={form.show_class_year}
        onChange={(v) => update('show_class_year', v)}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Sınıf</Text>
      <RadioGroup
        label=""
        options={CLASS_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.class_year}
        onChange={(v) => update('class_year', v as UpdateProfileInput['class_year'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Seviye</Text>
      <RadioGroup
        label=""
        options={SKILL_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.skill_self_assessment}
        onChange={(v) =>
          update('skill_self_assessment', v as UpdateProfileInput['skill_self_assessment'])
        }
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Dominant el</Text>
      <RadioGroup
        label=""
        options={HAND_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.dominant_hand}
        onChange={(v) => update('dominant_hand', v as UpdateProfileInput['dominant_hand'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Yarışma kategorisi</Text>
      <RadioGroup
        label=""
        options={GENDER_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.gender_category ?? 'erkek'}
        onChange={(v) => onChangeGender(v as UpdateProfileInput['gender_category'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Müsaitlik</Text>
      {AVAILABILITY_OPTIONS.map((a) => (
        <ToggleRow
          key={a.value}
          label={a.label}
          value={form.availability_windows.includes(a.value)}
          onChange={() => toggleAvailability(a.value)}
        />
      ))}

      <View className="mt-6 gap-2">
        <Button onPress={onSave} loading={mutation.isPending}>Kaydet</Button>
        <Button variant="ghost" onPress={() => router.back()}>İptal</Button>
      </View>
    </ScreenContainer>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm text-gray-900">{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
