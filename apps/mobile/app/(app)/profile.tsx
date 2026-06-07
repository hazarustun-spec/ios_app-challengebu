import { router } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
import { useMyMatchHistory } from '../../hooks/use-match-history';
import { useMyProfile } from '../../hooks/use-profile';
import { useAuthStore } from '../../stores/auth-store';

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
  const dept = p.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;

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

      <MatchHistorySection />
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

function MatchHistorySection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: matches } = useMyMatchHistory();
  const list = matches ?? [];

  if (!userId) return null;

  return (
    <View className="mt-8">
      <Text className="mb-2 text-lg font-semibold text-gray-900">Geçmiş Maçlar</Text>
      {list.length === 0 ? (
        <Text className="text-sm text-gray-500">Henüz oynanmış maç yok.</Text>
      ) : (
        list.slice(0, 20).map((m) => <HistoryRow key={m.id} match={m} myUserId={userId} />)
      )}
    </View>
  );
}

function HistoryRow({ match, myUserId }: { match: ActiveMatchRow; myUserId: string }) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const my = onTeamA ? match.score_team_a : match.score_team_b;
  const opp = onTeamA ? match.score_team_b : match.score_team_a;
  const iWon = (onTeamA && match.winner_team === 'a') || (!onTeamA && match.winner_team === 'b');
  const voided = match.winner_team === 'void';
  const ratingBefore = onTeamA ? match.rating_before_team_a : match.rating_before_team_b;
  const ratingAfter = onTeamA ? match.rating_after_team_a : match.rating_after_team_b;
  const delta = ratingBefore !== null && ratingAfter !== null ? ratingAfter - ratingBefore : null;
  const playedAt = new Date(match.played_at).toLocaleDateString('tr-TR');

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{playedAt}</Text>
        <Text className={`text-sm font-semibold ${voided ? 'text-gray-700' : iWon ? 'text-green-700' : 'text-red-700'}`}>
          {voided ? '⚠️ Voided' : iWon ? '🏆 Kazandın' : 'Kaybettin'}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-base text-gray-900">
          {voided ? '— — —' : `${my} - ${opp}`}
        </Text>
        {delta !== null && match.is_rated && (
          <Text className={delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700'}>
            {delta > 0 ? '+' : ''}{delta} ELO
          </Text>
        )}
      </View>
    </Pressable>
  );
}
