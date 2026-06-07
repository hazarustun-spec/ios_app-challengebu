import { Image, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMyProfile } from '../../hooks/use-profile';

export default function ProfileScreen() {
  const { data: p, isLoading } = useMyProfile();

  if (isLoading || !p) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pronounDisplay = p.pronoun === 'other' ? p.pronoun_custom : p.pronoun;
  const departmentName = (p.departments as { name: string } | null)?.name;

  return (
    <ScreenContainer scrollable>
      <View className="items-center pt-6">
        {p.avatar_url ? (
          <Image source={{ uri: p.avatar_url }} className="h-32 w-32 rounded-full bg-gray-200" />
        ) : (
          <View className="h-32 w-32 items-center justify-center rounded-full bg-gray-200">
            <Text className="text-3xl text-gray-500">{p.first_name?.[0]}{p.last_name?.[0]}</Text>
          </View>
        )}
        <Text className="mt-4 text-2xl font-bold text-gray-900">
          {p.first_name} {p.last_name}
        </Text>
        {pronounDisplay && <Text className="mt-1 text-gray-600">({pronounDisplay})</Text>}
      </View>

      <View className="mt-8 gap-3">
        {p.show_department && departmentName && (
          <Row label="Bölüm" value={departmentName} />
        )}
        {p.show_class_year && (
          <Row label="Sınıf" value={classYearLabel(p.class_year)} />
        )}
        <Row label="Seviye (kendi değerlendirmen)" value={skillLabel(p.skill_self_assessment)} />
        <Row label="Dominant el" value={handLabel(p.dominant_hand)} />
        <Row label="Yarışma kategorisi" value={genderCategoryLabel(p.gender_category)} />
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-gray-200 pb-2">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-base text-gray-900">{value}</Text>
    </View>
  );
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
function skillLabel(v: string): string {
  return ({ baslangic: 'Başlangıç', orta: 'Orta', ileri: 'İleri' } as Record<string, string>)[v] ?? v;
}
function handLabel(v: string): string {
  return ({ sag: 'Sağ el', sol: 'Sol el' } as Record<string, string>)[v] ?? v;
}
function genderCategoryLabel(v: string): string {
  return ({ erkek: 'Erkek', kadin: 'Kadın', open_only: 'Sadece Open' } as Record<string, string>)[v] ?? v;
}
