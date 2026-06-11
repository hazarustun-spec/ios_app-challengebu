// apps/mobile/app/match/new/opponent.tsx — Plan 8 Phase E13.
//
// Step 4 of "Yeni Maç" — picks the opponent (and partner, for doubles)
// from a searchable player list. Ports `NewMatchOpponent` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function NewMatchOpponent(...)`.
//
// Today the list is a static mock — a follow-up polish task will replace
// `MOCK_PLAYERS` with `usePlayerSearch(category)` so we hit the real
// leaderboard pool filtered by the wizard's chosen category.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Field } from '../../../components/ui/Field';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { levelForElo } from '../../../lib/levels';
import {
  useNewMatchStore,
  type OpponentChoice,
} from '../../../stores/new-match-store';
import { colors } from '../../../theme/colors';

// TODO(plan-8-E-polish): replace with usePlayerSearch(category) hook
// driven by the players + season_elo tables.
const MOCK_PLAYERS: OpponentChoice[] = [
  { userId: 'p1', name: 'Aleyna Kaya', elo: 1487 },
  { userId: 'p2', name: 'Berk Aydın', elo: 1748 },
  { userId: 'p3', name: 'Mert Şahin', elo: 1655 },
  { userId: 'p4', name: 'Onur Çelik', elo: 1432 },
  { userId: 'p5', name: 'Emre Yıldız', elo: 1788 },
  { userId: 'p6', name: 'Ali Koç', elo: 1487 },
  { userId: 'p7', name: 'Can Öztürk', elo: 1598 },
  { userId: 'p8', name: 'Eren Doğan', elo: 1320 },
];

export default function NewMatchOpponent() {
  const { path, opponent, setField } = useNewMatchStore();
  const [q, setQ] = useState('');
  const isOpen = path === 'open';
  const filtered = MOCK_PLAYERS.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title={isOpen ? 'İlan notu' : 'Rakip seç'}
        onBack={() => router.back()}
      />
      <View style={{ padding: 18, paddingTop: 4, paddingBottom: 10 }}>
        <Field
          icon="search"
          placeholder="Oyuncu ara…"
          value={q}
          onChange={setQ}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}>
        {filtered.map((p) => {
          const lv = levelForElo(p.elo);
          const on = opponent?.userId === p.userId;
          return (
            <Pressable
              key={p.userId}
              onPress={() => setField('opponent', p)}
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
              <Avatar name={p.name} size={42} />
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 14.5 }}
                >
                  {p.name}
                </Text>
                <Text
                  className="font-num font-bold"
                  style={{ fontSize: 12.5, color: lv.color, marginTop: 1 }}
                >
                  {p.elo} · {lv.name}
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
        })}
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
