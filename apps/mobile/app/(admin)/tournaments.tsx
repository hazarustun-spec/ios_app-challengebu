import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { BracketView } from '../../components/seasons/BracketView';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminTournaments, useVoidBracketMatch } from '../../hooks/use-admin-tournaments';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function AdminTournamentsScreen() {
  const list = useAdminTournaments();
  const [activeId, setActiveId] = useState<string | null>(null);
  const selected = activeId ?? list.data?.[0]?.id ?? null;
  const bracket = useTournamentBracket(selected ?? undefined);
  const voidMatch = useVoidBracketMatch();

  const handleVoid = (matchId: string | null) => {
    if (!matchId) return;
    Alert.alert(
      'Maçı voided yap',
      'Bu bracket maçı void edilecek ve advance pipeline durdurulacak. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Void et',
          style: 'destructive',
          onPress: () =>
            voidMatch.mutate(
              { matchId, reason: 'Admin tarafından bracket maçı voided' },
              {
                onError: (e) =>
                  Alert.alert('Hata', e instanceof Error ? e.message : 'Voided edilemedi'),
              },
            ),
        },
      ],
    );
  };

  if (list.isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  if ((list.data ?? []).length === 0) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Aktif turnuva yok.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {(list.data ?? []).map((t) => {
          const isActive = t.id === selected;
          return (
            <Pressable
              key={t.id}
              onPress={() => setActiveId(t.id)}
              className={`mr-2 rounded-full px-3 py-1 ${isActive ? 'bg-primary' : 'bg-gray-100'}`}
            >
              <Text className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>
                {CATEGORY_LABELS[t.category] ?? t.category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {bracket.data ? (
        <>
          <BracketView bracketSize={bracket.data.bracket_size} slots={bracket.data.slots} />
          <Text className="mt-4 mb-2 text-xs font-semibold text-gray-700">Admin aksiyonları</Text>
          <View className="gap-2">
            {bracket.data.slots
              .filter((s) => s.match_id !== null && s.match_status !== 'voided')
              .map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleVoid(s.match_id)}
                  className="rounded-lg border border-red-300 bg-red-50 p-2"
                >
                  <Text className="text-xs text-red-900">
                    Tur {s.round} pos {s.bracket_position}: {s.player_a_name ?? '—'} vs{' '}
                    {s.player_b_name ?? '—'} → voided yap
                  </Text>
                </Pressable>
              ))}
          </View>
        </>
      ) : (
        <Text className="text-sm text-gray-500">Bracket yükleniyor...</Text>
      )}
    </ScreenContainer>
  );
}
