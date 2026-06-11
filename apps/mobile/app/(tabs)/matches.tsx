// Maçlar Hub (Matches) — Plan 8 Phase E3.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`MatchesHub` + `UpcomingList` + `OffersList` + `FeedList` + `KindDot`)
//
// Tab screen for the Maçlar slot with three Segmented views:
//
//   1. Yaklaşan — confirmed + pending upcoming matches, with format/court
//      details and a "Kurallar" + "Skor gir" action row
//   2. Teklifler — incoming match challenges with accept/reject buttons
//   3. İlanlar   — open call feed with apply CTA + a link to one's own
//      open-call applicants screen
//
// The trailing NavHeader action is a clock icon that pushes the user
// into `/match/history`.
//
// Data wiring is intentionally STUBBED in this batch — Plan 8 Phase E3
// is a visual port. Each mock constant carries a `TODO(plan-8-E-polish)`
// marker so the integration pass (which queries `useUpcomingMatches`,
// `useMatchOffers`, `useOpenCalls`) knows what to swap in.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { FormatChip } from '../../components/ui/FormatChip';
import { colors } from '../../theme/colors';
import { levelForElo } from '../../lib/levels';
import type { FormatKey } from '../../lib/formats';

type HubView = 'upcoming' | 'offers' | 'feed';

// TODO(plan-8-E-polish): replace mocks with real hooks
// (`useUpcomingMatches`, `useMatchOffers`, `useOpenCalls`).
const MOCK_UPCOMING: Array<{
  id: string;
  opp: string;
  kind: 'ranking' | 'friendly';
  format: FormatKey;
  cat: string;
  date: string;
  time: string;
  court: string;
  status: 'confirmed' | 'pending';
}> = [
  {
    id: '1',
    opp: 'Berk Aydın',
    kind: 'ranking',
    format: 'klasik',
    cat: 'Erkek Tek',
    date: 'Bugün',
    time: '18:30',
    court: 'Kort 1',
    status: 'confirmed',
  },
  {
    id: '2',
    opp: 'Mert Şahin',
    kind: 'friendly',
    format: 'tiebreak',
    cat: 'Dostluk',
    date: 'Yarın',
    time: '12:00',
    court: 'Kort 2',
    status: 'confirmed',
  },
  {
    id: '3',
    opp: 'Deniz Arslan',
    kind: 'ranking',
    format: 'proset',
    cat: 'Erkek Tek',
    date: '8 Haz',
    time: '20:00',
    court: 'Bebek Kort',
    status: 'pending',
  },
];

// TODO(plan-8-E-polish): replace with `useMatchOffers()` query result.
const MOCK_OFFERS: Array<{
  id: string;
  from: string;
  elo: number;
  format: FormatKey;
  cat: string;
  time: string;
  court: string;
  kind: 'ranking' | 'friendly';
}> = [
  {
    id: 'o1',
    from: 'Emre Yıldız',
    elo: 1788,
    format: 'klasik',
    cat: 'Erkek Tek',
    time: 'Cmt 14:00',
    court: 'Kort 1',
    kind: 'ranking',
  },
  {
    id: 'o2',
    from: 'Onur Çelik',
    elo: 1432,
    format: 'set3',
    cat: 'Open Tek',
    time: 'Paz 11:00',
    court: 'Kort 2',
    kind: 'ranking',
  },
];

// TODO(plan-8-E-polish): replace with `useOpenCalls()` query result.
const MOCK_LISTINGS: Array<{
  id: string;
  from: string;
  elo: number;
  format: FormatKey;
  cat: string;
  window: string;
  court: string;
  applicants: number;
  kind: 'ranking' | 'friendly';
}> = [
  {
    id: 'l1',
    from: 'Can Öztürk',
    elo: 1598,
    format: 'klasik',
    cat: 'Erkek Tek',
    window: 'Bu hafta · akşamları',
    court: 'Esnek',
    applicants: 4,
    kind: 'ranking',
  },
  {
    id: 'l2',
    from: 'Ada Çelik',
    elo: 1498,
    format: 'tiebreak',
    cat: 'Open Tek',
    window: 'Hafta sonu · sabah',
    court: 'Kort 1',
    applicants: 2,
    kind: 'friendly',
  },
  {
    id: 'l3',
    from: 'Ali Koç',
    elo: 1487,
    format: 'proset',
    cat: 'Erkek Tek',
    window: 'Yarın 19:00',
    court: 'Kort 2',
    applicants: 0,
    kind: 'ranking',
  },
];

export default function MatchesTab() {
  const [view, setView] = useState<HubView>('upcoming');

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        large
        title="Maçlar"
        actionIcon="clock"
        onAction={() => router.push('/match/history' as never)}
      />
      <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 }}>
        <Segmented<HubView>
          value={view}
          onChange={setView}
          options={[
            { value: 'upcoming', label: 'Yaklaşan' },
            { value: 'offers', label: 'Teklifler' },
            { value: 'feed', label: 'İlanlar' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 11 }}>
        {view === 'upcoming' && <UpcomingList />}
        {view === 'offers' && <OffersList />}
        {view === 'feed' && <FeedList />}
      </ScrollView>
    </View>
  );
}

function KindDot({ kind }: { kind: 'ranking' | 'friendly' }) {
  const ranking = kind === 'ranking';
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <Icon
        name={ranking ? 'trophy' : 'handshake'}
        size={13}
        color={ranking ? colors.clay : colors.pinkDeep}
      />
      <Text
        className="font-sans font-bold"
        style={{
          fontSize: 11.5,
          color: ranking ? colors.clayText : colors.pinkDeep,
        }}
      >
        {ranking ? 'Sıralama' : 'Dostluk'}
      </Text>
    </View>
  );
}

function UpcomingList() {
  return (
    <>
      {MOCK_UPCOMING.map((m) => (
        <View
          key={m.id}
          className="rounded-lg border-base border-border-strong bg-surface overflow-hidden"
        >
          <View
            className="flex-row items-center"
            style={{ padding: 14, paddingHorizontal: 16, gap: 12 }}
          >
            <Avatar name={m.opp} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 15.5 }}
              >
                {m.opp}
              </Text>
              <View
                className="flex-row items-center"
                style={{ marginTop: 3, gap: 7 }}
              >
                <KindDot kind={m.kind} />
                <Text className="text-text-3" style={{ fontSize: 12 }}>
                  · {m.cat}
                </Text>
              </View>
            </View>
            {m.status === 'pending' ? (
              <View
                className="flex-row items-center rounded-pill"
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  gap: 4,
                  backgroundColor: colors.warnSoft,
                }}
              >
                <Icon name="clock" size={12} color={colors.warn} />
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: colors.warn,
                  }}
                >
                  Onay bekliyor
                </Text>
              </View>
            ) : (
              <View
                className="flex-row items-center rounded-pill"
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  gap: 4,
                  backgroundColor: colors.limeSoft,
                }}
              >
                <Icon name="check" size={12} color={colors.win} stroke={3} />
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: colors.win,
                  }}
                >
                  Onaylı
                </Text>
              </View>
            )}
          </View>
          <View
            className="flex-row items-center"
            style={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Icon name="calendar" size={15} color={colors.text3} />
              <Text
                className="font-sans font-semibold text-text-2"
                style={{ fontSize: 13 }}
              >
                {m.date} · {m.time}
              </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Icon name="pin" size={15} color={colors.text3} />
              <Text
                className="font-sans font-semibold text-text-2"
                style={{ fontSize: 13 }}
              >
                {m.court}
              </Text>
            </View>
            <FormatChip fmtKey={m.format} />
          </View>
          <View
            className="flex-row"
            style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
          >
            <View style={{ flex: 1 }}>
              <Button
                size="sm"
                variant="secondary"
                full
                icon={<Icon name="info" size={15} color={colors.text} />}
                onPress={() =>
                  router.push(
                    `/match/${m.id}/format-rules?format=${m.format}` as never,
                  )
                }
              >
                Kurallar
              </Button>
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                size="sm"
                full
                icon={<Icon name="spark" size={15} color={colors.onLime} />}
                onPress={() =>
                  router.push(`/match/${m.id}/score` as never)
                }
              >
                Skor gir
              </Button>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

function OffersList() {
  return (
    <>
      {MOCK_OFFERS.map((m) => {
        const lv = levelForElo(m.elo);
        return (
          <View
            key={m.id}
            className="rounded-lg border-base border-border-strong bg-surface"
            style={{ padding: 16 }}
          >
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 12 }}
            >
              <Avatar name={m.from} size={46} />
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 15.5 }}
                >
                  {m.from}
                </Text>
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 12.5, marginTop: 2 }}
                >
                  sana meydan okudu
                </Text>
              </View>
              <Text
                className="font-num font-bold"
                style={{ fontSize: 17, color: lv.color }}
              >
                {m.elo}
              </Text>
            </View>
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 13, flexWrap: 'wrap' }}
            >
              <FormatChip fmtKey={m.format} />
              <Text
                className="font-sans font-semibold text-text-2"
                style={{ fontSize: 12.5 }}
              >
                {m.time} · {m.court}
              </Text>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button size="sm" variant="danger" full onPress={() => {}}>
                  Reddet
                </Button>
              </View>
              <View style={{ flex: 1.6 }}>
                <Button
                  size="sm"
                  full
                  icon={
                    <Icon
                      name="check"
                      size={15}
                      color={colors.onLime}
                      stroke={3}
                    />
                  }
                  onPress={() => {}}
                >
                  Kabul et
                </Button>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

function FeedList() {
  return (
    <>
      {MOCK_LISTINGS.map((m) => {
        const lv = levelForElo(m.elo);
        return (
          <View
            key={m.id}
            className="rounded-lg border-base border-border-strong bg-surface"
            style={{ padding: 16 }}
          >
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 12 }}
            >
              <Avatar name={m.from} size={42} />
              <View style={{ flex: 1 }}>
                <View
                  className="flex-row items-baseline"
                  style={{ gap: 5 }}
                >
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 15 }}
                  >
                    {m.from}
                  </Text>
                  <Text
                    className="font-num font-bold"
                    style={{ fontSize: 13, color: lv.color }}
                  >
                    · {m.elo}
                  </Text>
                </View>
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 12.5, marginTop: 1 }}
                >
                  {m.cat}
                </Text>
              </View>
              {m.applicants > 0 && (
                <View
                  className="flex-row items-center rounded-pill"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    gap: 3,
                    backgroundColor: colors.surface2,
                  }}
                >
                  <Icon name="user" size={12} color={colors.text2} />
                  <Text
                    className="font-sans font-bold text-text-2"
                    style={{ fontSize: 11.5 }}
                  >
                    {m.applicants}
                  </Text>
                </View>
              )}
            </View>
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 13, flexWrap: 'wrap' }}
            >
              <FormatChip fmtKey={m.format} />
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="clock" size={14} color={colors.text3} />
                <Text
                  className="font-sans font-semibold text-text-2"
                  style={{ fontSize: 12.5 }}
                >
                  {m.window}
                </Text>
              </View>
            </View>
            <Button
              full
              size="sm"
              variant={m.applicants > 0 ? 'secondary' : 'primary'}
              icon={
                <Icon
                  name="flag"
                  size={15}
                  color={m.applicants > 0 ? colors.text : colors.onLime}
                />
              }
              onPress={() => {}}
            >
              İlana başvur
            </Button>
          </View>
        );
      })}
      <Pressable
        onPress={() =>
          router.push('/match/open-applicants/my-listing' as never)
        }
        className="rounded-md"
        style={{
          marginTop: 4,
          padding: 13,
          backgroundColor: colors.surface2,
          alignItems: 'center',
        }}
      >
        <Text
          className="font-sans font-bold text-text-2"
          style={{ fontSize: 13.5 }}
        >
          Kendi ilanına başvuranları gör →
        </Text>
      </Pressable>
    </>
  );
}
