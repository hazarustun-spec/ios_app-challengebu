// Singles finale bracket — Plan 8 Phase F9, live-wired.
//
// Wired to Supabase via:
//   - useCurrentSeason() → current season id
//   - useQuery (inline) → tournaments table → erkek_tek tournament id
//   - useTournamentBracket(tournamentId) → BracketSlot[] with player names
//
// Horizontal scroll with three column groups: QF / SF / Final + champion
// card. Rounds are inferred from BracketSlot.round (1 = QF, 2 = SF, 3 = F)
// for an 8-player bracket. Graceful empty when no bracket seeded.

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useTournamentBracket, type BracketSlot } from '../../hooks/use-tournament-bracket';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-keys';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type SlotData = { name?: string; win?: boolean; id?: string };

// ---------------------------------------------------------------------------
// Sub-components (design-preserved)
// ---------------------------------------------------------------------------

function Slot({ name, win, top, id }: { name?: string; win?: boolean; top?: boolean; id?: string }) {
  const slotStyle = {
    padding: 7,
    paddingHorizontal: 9,
    gap: 7,
    backgroundColor: win ? colors.claySofter : colors.surface,
    borderTopWidth: top ? 0 : 1,
    borderColor: colors.surface3,
  } as const;

  const content = (
    <>
      {name ? (
        <Avatar name={name} size={22} />
      ) : (
        <View
          style={{ width: 22, height: 22, borderRadius: 8, backgroundColor: colors.surface3 }}
        />
      )}
      <Text
        className="font-sans"
        style={{
          flex: 1,
          fontSize: 11.5,
          fontWeight: win ? '800' : '600',
          color: name ? colors.text : colors.text3,
        }}
        numberOfLines={1}
      >
        {name ? name.split(' ')[0] : '—'}
      </Text>
      {win && <Icon name="check" size={12} color={colors.clay} stroke={3} />}
    </>
  );

  if (id && name) {
    return (
      <Pressable
        className="flex-row items-center active:opacity-70"
        style={slotStyle}
        onPress={() => router.push(`/user/${id}` as never)}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center" style={slotStyle}>
      {content}
    </View>
  );
}

function Match({ a, b }: { a: SlotData; b: SlotData }) {
  return (
    <View
      style={{
        width: 124,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
      }}
    >
      <Slot name={a.name} win={a.win} top id={a.id} />
      <Slot name={b.name} win={b.win} id={b.id} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers: parse BracketSlot[] into per-round matches
// ---------------------------------------------------------------------------

/** Convert a BracketSlot into a pair of SlotData (a + b). */
function slotToMatchPair(slot: BracketSlot): [SlotData, SlotData] {
  const aWon = slot.winner_team === 'a';
  const bWon = slot.winner_team === 'b';
  return [
    { name: slot.player_a_name ?? undefined, win: aWon || undefined, id: slot.player_a_id ?? undefined },
    { name: slot.player_b_name ?? undefined, win: bWon || undefined, id: slot.player_b_id ?? undefined },
  ];
}

/** Group BracketSlot[] by round, sorted by bracket_position within each round. */
function groupByRound(slots: BracketSlot[]): Map<number, BracketSlot[]> {
  const map = new Map<number, BracketSlot[]>();
  for (const s of slots) {
    const arr = map.get(s.round) ?? [];
    arr.push(s);
    map.set(s.round, arr);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => a.bracket_position - b.bracket_position);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function Bracket() {
  const seasonQ = useCurrentSeason();
  const seasonId = seasonQ.data?.id;

  // Fetch the erkek_tek tournament for the current season.
  const tournamentQ = useQuery<string | null>({
    queryKey: seasonId
      ? [...queryKeys.tournaments.bySeason(seasonId), 'erkek_tek']
      : [...queryKeys.tournaments.all, 'erkek_tek', 'no-season'],
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) return null;
      const { data, error } = await supabase
        .from('tournaments')
        .select('id')
        .eq('season_id', seasonId)
        .eq('category', 'erkek_tek')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });

  const tournamentId = tournamentQ.data ?? undefined;
  const bracketQ = useTournamentBracket(tournamentId);

  // Unified loading state
  const isLoading = seasonQ.isLoading || tournamentQ.isLoading || bracketQ.isLoading;
  const isError = seasonQ.isError || tournamentQ.isError || bracketQ.isError;

  const header = (
    <NavHeader
      title="Sezon Finali"
      subtitle="Erkek Tek · Top 8 · tek eleme"
      onBack={() => router.back()}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ gap: 12 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14 }}>
            Bracket yüklenemedi.
          </Text>
          <Pressable
            onPress={() => {
              void seasonQ.refetch();
              void tournamentQ.refetch();
              void bracketQ.refetch();
            }}
          >
            <Text className="font-sans font-bold" style={{ fontSize: 14, color: colors.court }}>
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // No tournament or no slots seeded yet
  const bracket = bracketQ.data;
  const slots = bracket?.slots ?? [];

  if (!bracket || slots.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ gap: 8 }}>
          <Icon name="trophy" size={40} color={colors.text3} />
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 14, textAlign: 'center', paddingHorizontal: 32 }}
          >
            Finale bracket henüz ekilmedi.
          </Text>
        </View>
      </View>
    );
  }

  // Group slots by round
  const byRound = groupByRound(slots);

  // For an 8-player bracket: round 1 = QF (4 matches), round 2 = SF (2 matches), round 3 = F (1 match)
  // For a 4-player bracket: round 1 = SF (2 matches), round 2 = F (1 match)
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  const totalRounds = rounds.length;

  // Determine QF / SF / F by position from the end
  const finalRound = rounds[totalRounds - 1];
  const sfRound = totalRounds >= 2 ? rounds[totalRounds - 2] : null;
  const qfRound = totalRounds >= 3 ? rounds[totalRounds - 3] : null;

  const finalSlots = byRound.get(finalRound) ?? [];
  const sfSlots = sfRound !== null ? (byRound.get(sfRound) ?? []) : [];
  const qfSlots = qfRound !== null ? (byRound.get(qfRound) ?? []) : [];

  // Determine champion name from final slot
  const finalSlot = finalSlots[0] ?? null;
  let championName: string | null = null;
  if (finalSlot) {
    if (finalSlot.winner_team === 'a' && finalSlot.player_a_name) {
      championName = finalSlot.player_a_name;
    } else if (finalSlot.winner_team === 'b' && finalSlot.player_b_name) {
      championName = finalSlot.player_b_name;
    }
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView horizontal contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 18 }}>

        {/* Çeyrek — only shown for 8-player brackets */}
        {qfSlots.length > 0 && (
          <View style={{ gap: 14 }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 10.5, letterSpacing: 0.6 }}
            >
              ÇEYREK
            </Text>
            {qfSlots.map((slot) => {
              const [a, b] = slotToMatchPair(slot);
              return <Match key={slot.id} a={a} b={b} />;
            })}
          </View>
        )}

        {/* Yarı */}
        {sfSlots.length > 0 && (
          <View style={{ gap: 14, justifyContent: 'center' }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 10.5, letterSpacing: 0.6 }}
            >
              YARI
            </Text>
            {sfSlots.map((slot) => {
              const [a, b] = slotToMatchPair(slot);
              return (
                <View key={slot.id} style={{ marginVertical: qfSlots.length > 0 ? 34 : 0 }}>
                  <Match a={a} b={b} />
                </View>
              );
            })}
          </View>
        )}

        {/* Final */}
        {finalSlots.length > 0 && (
          <View style={{ gap: 10, justifyContent: 'center' }}>
            <Text
              className="font-sans font-extrabold"
              style={{ fontSize: 10.5, letterSpacing: 0.6, color: colors.clay }}
            >
              FİNAL · 3 SET
            </Text>
            {finalSlots.map((slot) => {
              const [a, b] = slotToMatchPair(slot);
              return <Match key={slot.id} a={a} b={b} />;
            })}
            <View
              style={{
                marginTop: 14,
                width: 124,
                backgroundColor: championName ? colors.court : colors.surface2,
                borderRadius: 18,
                padding: 14,
                paddingHorizontal: 12,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
              }}
            >
              <Icon name="crown" size={24} color={championName ? '#FFFFFF' : colors.text3} />
              <Text
                className="font-sans font-extrabold"
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  color: championName ? '#FFFFFF' : colors.text3,
                }}
              >
                {championName ? championName.split(' ')[0] : '—'}
              </Text>
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '600',
                  color: championName ? 'rgba(255,255,255,0.85)' : colors.text3,
                }}
              >
                {championName ? 'Şampiyon' : 'Belirlenmedi'}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
