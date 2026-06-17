// apps/mobile/app/match/new/opponent.tsx — Plan 8 Phase E13, wired to live data.
//
// Step 4 of "Yeni Maç" — picks the opponent (and partner, for doubles)
// from a searchable player list. Ports `NewMatchOpponent` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function NewMatchOpponent(...)`.
//
// Live data: usePlayers({ gender }) filtered by the wizard's chosen category.
// ELO: useLadder(category).ratingOf(player.user_id) supplies the real season
// ELO for each player row and the stored OpponentChoice.elo value.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Field } from '../../../components/ui/Field';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { levelForElo } from '../../../lib/levels';
import {
  useNewMatchStore,
  type CategoryKey,
  type OpponentChoice,
} from '../../../stores/new-match-store';
import { usePlayers, type PlayerRow } from '../../../hooks/use-players';
import { useLadder } from '../../../hooks/use-ladder';
import { colors } from '../../../theme/colors';

/** Map the wizard's category to the gender filter accepted by usePlayers. */
function categoryToGender(
  category: CategoryKey,
): 'erkek' | 'kadin' | 'open_only' | undefined {
  if (category.startsWith('erkek_')) return 'erkek';
  if (category.startsWith('kadin_')) return 'kadin';
  // open_* and karma_* categories include all genders — no filter.
  return undefined;
}

/** Convert a PlayerRow + resolved ELO to the OpponentChoice shape the store expects. */
function toOpponentChoice(p: PlayerRow, elo: number): OpponentChoice {
  return {
    userId: p.user_id,
    name: `${p.first_name} ${p.last_name}`,
    elo,
  };
}

export default function NewMatchOpponent() {
  const { path, category, opponent, setField } = useNewMatchStore();
  const [q, setQ] = useState('');
  const isOpen = path === 'open';

  const gender = categoryToGender(category);
  const playersQ = usePlayers(gender ? { gender } : undefined);
  const { ratingOf } = useLadder(category);
  const allPlayers: PlayerRow[] = playersQ.data ?? [];

  const filtered = allPlayers.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(q.toLowerCase());
  });

  const header = (
    <NavHeader
      title={isOpen ? 'İlan notu' : 'Rakip seç'}
      onBack={() => router.back()}
    />
  );

  if (playersQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (playersQ.isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14, textAlign: 'center' }}>
            Oyuncular yüklenemedi. Lütfen tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <View style={{ padding: 18, paddingTop: 4, paddingBottom: 10 }}>
        <Field
          icon="search"
          placeholder="Oyuncu ara…"
          value={q}
          onChange={setQ}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}>
        {filtered.length === 0 ? (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 13, paddingHorizontal: 4, paddingTop: 8 }}
          >
            {q ? 'Eşleşen oyuncu bulunamadı.' : 'Henüz kayıtlı oyuncu yok.'}
          </Text>
        ) : (
          filtered.map((p) => {
            const elo = ratingOf(p.user_id) ?? 0;
            const choice = toOpponentChoice(p, elo);
            const lv = levelForElo(elo);
            const on = opponent?.userId === choice.userId;
            return (
              <Pressable
                key={choice.userId}
                onPress={() => setField('opponent', choice)}
                className="flex-row items-center rounded-md"
                style={{
                  padding: 11,
                  paddingHorizontal: 12,
                  gap: 12,
                  borderWidth: 1.5,
                  borderColor: on ? colors.clay : colors.borderStrong,
                  backgroundColor: on ? colors.claySofter : colors.surface,
                }}
              >
                <Avatar name={choice.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 14.5 }}
                  >
                    {choice.name}
                  </Text>
                  <Text
                    className="font-num font-bold"
                    style={{ fontSize: 12.5, color: lv.color, marginTop: 1 }}
                  >
                    {lv.name}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: on ? 0 : 2,
                    borderColor: colors.borderStrong,
                    backgroundColor: on ? colors.clay : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on && (
                    <Icon name="check" size={13} color="#FFFFFF" stroke={3} />
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          disabled={!opponent}
          onPress={() => router.push('/match/new/preview' as never)}
        >
          Önizlemeye geç
        </Button>
      </View>
    </View>
  );
}
