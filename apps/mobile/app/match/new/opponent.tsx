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
//
// Singles (category group 'tek'): pick one opponent — original behaviour.
//
// Doubles direct (group 'cift', path 'direct'): three labelled slots
//   • Partnerin        → store.partner
//   • Rakip            → store.opponent
//   • Rakip Partneri   → store.opponentPartner
// A slot-tab row at the top lets the user switch between slots. A player
// already chosen in one slot is excluded from the other slots' lists.
// The CTA is gated until all three slots are filled.
//
// Doubles open (group 'cift', path 'open'): only the "Partnerin" slot is
// shown — the opposing pair is unknown until someone applies. CTA is gated
// until the partner slot is filled.

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
import { useAuthStore } from '../../../stores/auth-store';
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

// Doubles slot definitions (direct challenge).
type DoubleSlot = 'partner' | 'opponent' | 'opponentPartner';

interface SlotDef {
  key: DoubleSlot;
  label: string;
}

const DIRECT_SLOTS: SlotDef[] = [
  { key: 'partner', label: 'Partnerin' },
  { key: 'opponent', label: 'Rakip' },
  { key: 'opponentPartner', label: 'Rakip Partneri' },
];

const OPEN_SLOTS: SlotDef[] = [{ key: 'partner', label: 'Partnerin' }];

export default function NewMatchOpponent() {
  const { path, category, opponent, partner, opponentPartner, setField } =
    useNewMatchStore();
  const myUserId = useAuthStore((s) => s.user?.id);
  const [q, setQ] = useState('');
  const [activeSlot, setActiveSlot] = useState<DoubleSlot>('partner');

  const isOpen = path === 'open';
  const isDoubles = category.endsWith('_cift');

  const gender = categoryToGender(category);
  const playersQ = usePlayers(gender ? { gender } : undefined);
  const { ratingOf } = useLadder(category);
  const allPlayers: PlayerRow[] = playersQ.data ?? [];

  // ---- Doubles helpers ----
  const visibleSlots: SlotDef[] = isDoubles
    ? isOpen
      ? OPEN_SLOTS
      : DIRECT_SLOTS
    : [];

  function getSlotValue(slot: DoubleSlot): OpponentChoice | null {
    if (slot === 'partner') return partner;
    if (slot === 'opponent') return opponent;
    return opponentPartner;
  }

  function setSlotValue(slot: DoubleSlot, choice: OpponentChoice): void {
    if (slot === 'partner') setField('partner', choice);
    else if (slot === 'opponent') setField('opponent', choice);
    else setField('opponentPartner', choice);
  }

  // Build exclusion set: self + players already chosen in OTHER slots.
  const taken = new Set<string>();
  if (myUserId) taken.add(myUserId);
  if (isDoubles) {
    if (activeSlot !== 'partner' && partner) taken.add(partner.userId);
    if (activeSlot !== 'opponent' && opponent) taken.add(opponent.userId);
    if (activeSlot !== 'opponentPartner' && opponentPartner)
      taken.add(opponentPartner.userId);
  }
  // For singles, only exclude self (taken already has myUserId).

  const filtered = allPlayers.filter((p) => {
    if (taken.has(p.user_id)) return false;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(q.toLowerCase());
  });

  // The currently selected choice for the active list.
  const activeChoice: OpponentChoice | null = isDoubles
    ? getSlotValue(activeSlot)
    : opponent;

  // CTA gate.
  const canProceed = isDoubles
    ? isOpen
      ? !!partner
      : !!partner && !!opponent && !!opponentPartner
    : !!opponent;

  // ---- Header title ----
  const headerTitle = isDoubles
    ? isOpen
      ? 'Partner seç'
      : 'Oyuncuları seç'
    : isOpen
      ? 'İlan notu'
      : 'Rakip seç';

  const header = (
    <NavHeader title={headerTitle} onBack={() => router.back()} />
  );

  // ---- Loading / error states ----
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
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            Oyuncular yüklenemedi. Lütfen tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  // ---- Player row renderer (shared between modes) ----
  const playerList = (
    <>
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
          const on = activeChoice?.userId === choice.userId;
          return (
            <Pressable
              key={choice.userId}
              onPress={() => {
                if (isDoubles) setSlotValue(activeSlot, choice);
                else setField('opponent', choice);
              }}
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
                  {lv.name} · {elo > 0 ? elo : '—'}
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
    </>
  );

  // ---- Doubles layout ----
  if (isDoubles) {
    return (
      <View className="flex-1 bg-bg">
        {header}

        {/* Slot tabs — only shown when there are multiple slots (direct challenge). */}
        {visibleSlots.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 4,
              gap: 8,
            }}
          >
            {visibleSlots.map((slot) => {
              const isActive = activeSlot === slot.key;
              const filled = !!getSlotValue(slot.key);
              return (
                <Pressable
                  key={slot.key}
                  onPress={() => {
                    setActiveSlot(slot.key);
                    setQ('');
                  }}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.clay : colors.borderStrong,
                    backgroundColor: isActive ? colors.claySofter : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {filled && (
                    <Icon name="check" size={11} color={colors.clay} stroke={3} />
                  )}
                  <Text
                    className="font-sans font-bold"
                    style={{
                      fontSize: 13.5,
                      color: isActive ? colors.clay : colors.text2,
                    }}
                  >
                    {slot.label}
                  </Text>
                  {filled && (
                    <Text
                      className="font-sans text-text-3"
                      style={{ fontSize: 11 }}
                    >
                      · {getSlotValue(slot.key)!.name.split(' ')[0]}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Active slot label + search field. */}
        <View style={{ padding: 18, paddingTop: 12, paddingBottom: 10 }}>
          <Text
            className="font-sans font-bold text-text-3"
            style={{ fontSize: 11.5, marginBottom: 8 }}
          >
            {visibleSlots.find((s) => s.key === activeSlot)?.label ?? 'Seç'}
          </Text>
          <Field
            icon="search"
            placeholder="Oyuncu ara…"
            value={q}
            onChange={setQ}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        >
          {playerList}
        </ScrollView>

        <View style={{ padding: 18 }}>
          <Button
            full
            size="lg"
            disabled={!canProceed}
            onPress={() => router.push('/match/new/preview' as never)}
          >
            Önizlemeye geç
          </Button>
        </View>
      </View>
    );
  }

  // ---- Singles layout (original behaviour) ----
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
        {playerList}
      </ScrollView>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          disabled={!canProceed}
          onPress={() => router.push('/match/new/preview' as never)}
        >
          Önizlemeye geç
        </Button>
      </View>
    </View>
  );
}
