import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import type { BracketSlot } from '../../hooks/use-tournament-bracket';

interface Props {
  bracketSize: number;
  slots: BracketSlot[];
}

const ROUND_LABELS_8: Record<number, string> = {
  1: 'ÇEYREK',
  2: 'YARI',
  3: 'FİNAL',
};

const ROUND_LABELS_4: Record<number, string> = {
  1: 'YARI',
  2: 'FİNAL',
};

// ---------------------------------------------------------------------------
// Slot — one player row inside a match card
// ---------------------------------------------------------------------------

function Slot({
  name,
  score,
  win,
  top,
  playerId,
}: {
  name: string | null;
  score: number | null;
  win: boolean;
  top?: boolean;
  playerId?: string | null;
}) {
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
      {score !== null && (
        <Text
          className="font-num"
          style={{
            fontSize: 11.5,
            fontWeight: win ? '800' : '600',
            color: win ? colors.clay : colors.text3,
          }}
        >
          {score}
        </Text>
      )}
      {win && <Icon name="check" size={12} color={colors.clay} stroke={3} />}
    </>
  );

  if (playerId && name) {
    return (
      <Pressable
        className="flex-row items-center active:opacity-70"
        style={slotStyle}
        onPress={() => router.push(`/user/${playerId}` as never)}
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

// ---------------------------------------------------------------------------
// MatchCard — two-slot card, tappable when a match_id is available
// ---------------------------------------------------------------------------

function MatchCard({ slot }: { slot: BracketSlot }) {
  const aWon = slot.winner_team === 'a';
  const bWon = slot.winner_team === 'b';
  const onPress = slot.match_id ? () => router.push(`/match/${slot.match_id}`) : undefined;

  const card = (
    <View
      style={{
        width: 124,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
      }}
    >
      <Slot name={slot.player_a_name} score={slot.score_team_a} win={aWon} top playerId={slot.player_a_id} />
      <Slot name={slot.player_b_name} score={slot.score_team_b} win={bWon} playerId={slot.player_b_id} />
    </View>
  );

  if (!onPress) return card;
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      {card}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// BracketView — horizontally laid-out round columns
// ---------------------------------------------------------------------------

export function BracketView({ bracketSize, slots }: Props) {
  const rounds = bracketSize === 8 ? [1, 2, 3] : [1, 2];
  const labels = bracketSize === 8 ? ROUND_LABELS_8 : ROUND_LABELS_4;

  const byRound = new Map<number, BracketSlot[]>();
  for (const s of slots) {
    const list = byRound.get(s.round) ?? [];
    list.push(s);
    byRound.set(s.round, list);
  }

  // Determine champion from the final slot winner
  const finalRound = rounds[rounds.length - 1];
  const finalSlots = byRound.get(finalRound) ?? [];
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
    <View className="flex-row" style={{ gap: 18, alignItems: 'center' }}>
      {rounds.map((r) => {
        const isFinal = r === finalRound;
        // SF column in an 8-player bracket gets vertical spacing so cards
        // visually align with the two QF matches they connect.
        const isSf = bracketSize === 8 && r === rounds[rounds.length - 2];
        const roundSlots = byRound.get(r) ?? [];

        return (
          <View key={r} style={{ gap: 14, justifyContent: 'center' }}>
            {/* Round section label */}
            <Text
              className="font-sans font-extrabold"
              style={{
                fontSize: 10.5,
                letterSpacing: 0.6,
                color: isFinal ? colors.clay : colors.text3,
              }}
            >
              {isFinal ? `${labels[r]} · 3 SET` : labels[r]}
            </Text>

            {/* Match cards */}
            {roundSlots.map((s) => (
              <View key={s.id} style={{ marginVertical: isSf ? 34 : 0 }}>
                <MatchCard slot={s} />
              </View>
            ))}

            {/* Champion card — shown below the final match */}
            {isFinal && (
              <View
                style={{
                  marginTop: 10,
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
            )}
          </View>
        );
      })}
    </View>
  );
}
