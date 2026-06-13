// Anasayfa (Home) — Plan 8 Phase E2.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-home.jsx (Home)
//
// Landing screen after onboarding completes. Renders, top-to-bottom:
//
//   1. `GreetHeader` greeting + bell with unread pip
//   2. ELO HERO  — court-blue card with current ELO + #rank + delta,
//      a mini "Son 10 maç" sparkline trend, and a level-progress bar
//      that surfaces the next level + remaining ELO points
//   3. CTA row — primary "Yeni Maç" lime pill that opens the wizard,
//      plus a 56×56 ranking-icon button that goes to the leaderboard
//   4. "Aktif maçlar" section — upcoming/in-progress matches list
//   5. "Son sonuçlar" section — last few finalized matches
//   6. Sezon banner — countdown card to the season finale (clay-softer)
//
// Data wiring is deliberately STUBBED in this batch — Plan 8 Phase E2
// is a visual port of the design source, not a full integration pass.
// Each mock constant has a `TODO(plan-8-E*)` marker so the polish pass
// (which queries `useMyRankings`, `useActiveMatches`, `useMatchHistory`,
// `useEloHistory`, `useUpcomingFinaleStatus`) knows what to swap.
//
// The user's display name is read live from `useAuthStore.profile` so
// the screen feels personalized as soon as it loads — the rest of the
// data is hardcoded.

import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { GreetHeader } from '../../components/ui/GreetHeader';
import { Icon } from '../../components/ui/Icon';
import { Sparkline } from '../../components/ui/Sparkline';
import { useUnreadCount } from '../../hooks/use-unread-count';
import { levelForElo, levelProgress } from '../../lib/levels';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Mock data — replaced in the polish pass once Phase E hooks are in place
// ---------------------------------------------------------------------------

// TODO(plan-8-E-polish): derive from `useMyRankings` (current category ELO).
const ME_ELO = 1487;
// TODO(plan-8-E-polish): derive from `useMyRankings` (current category rank).
const ME_RANK = 4;
// TODO(plan-8-E-polish): derive from latest match in `useMatchHistory`.
const ELO_DELTA = 22;
// TODO(plan-8-E-polish): derive from `useEloHistory(10)` for current category.
const ELO_TREND = [1465, 1462, 1472, 1480, 1475, 1487];
// TODO(plan-8-E-polish): derive from `useUpcomingFinaleStatus`.
const SEASON_DAYS_LEFT = 41;

interface ActiveMatchStub {
  id: string;
  opponentId: string;
  opponentName: string;
  kind: 'ranking' | 'friendly';
  whenLabel: string;
}
// TODO(plan-8-E-polish): replace with `useActiveMatches`.
const ACTIVE_MATCHES: ActiveMatchStub[] = [
  {
    id: '1',
    opponentId: 'p-berk',
    opponentName: 'Berk Aydın',
    kind: 'ranking',
    whenLabel: 'Bugün 18:30 · Kort 1',
  },
  {
    id: '2',
    opponentId: 'p-mert',
    opponentName: 'Mert Şahin',
    kind: 'friendly',
    whenLabel: 'Yarın 12:00 · Kort 2',
  },
];

interface RecentMatchStub {
  id: string;
  opponentId: string;
  opponentName: string;
  win: boolean;
  score: string;
  delta: number;
  whenLabel: string;
}
// TODO(plan-8-E-polish): replace with `useMatchHistory({ limit: 2 })`.
const RECENT_MATCHES: RecentMatchStub[] = [
  {
    id: 'r1',
    opponentId: 'p-onur',
    opponentName: 'Onur Çelik',
    win: true,
    score: '4-2',
    delta: 22,
    whenLabel: '2 gün önce',
  },
  {
    id: 'r2',
    opponentId: 'p-eren',
    opponentName: 'Eren Doğan',
    win: false,
    score: '3-4',
    delta: -14,
    whenLabel: '5 gün önce',
  },
];

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { data: unreadCount = 0 } = useUnreadCount();
  const displayName = profile?.firstName ?? 'Oyuncu';
  const lv = levelForElo(ME_ELO);
  const lp = levelProgress(ME_ELO);

  return (
    <View className="flex-1 bg-bg">
      <GreetHeader
        name={displayName}
        sub="Bugün maç günü mü?"
        unreadCount={unreadCount}
        onBellPress={() => router.push('/notifications')}
      />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        {/* ELO HERO */}
        <View
          className="bg-court border-base border-border-strong"
          style={{ borderRadius: 26, padding: 18, overflow: 'hidden' }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text
                className="font-sans font-extrabold"
                style={{
                  fontSize: 10.5,
                  letterSpacing: 1.05,
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                GÜNCEL ELO · ERKEK TEK
              </Text>
              <View
                className="flex-row items-end"
                style={{ gap: 9, marginTop: 4 }}
              >
                <Text
                  className="font-num font-extrabold text-white"
                  style={{
                    fontSize: 42,
                    lineHeight: 50,
                    letterSpacing: -0.84,
                  }}
                >
                  {ME_ELO}
                </Text>
                <View
                  className="flex-row items-center"
                  style={{ gap: 1, marginBottom: 5 }}
                >
                  <Icon name="chevU" size={14} color={colors.lime} stroke={3} />
                  <Text
                    className="font-num font-extrabold"
                    style={{ fontSize: 14, color: colors.lime }}
                  >
                    {ELO_DELTA}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                className="font-num font-extrabold text-white"
                style={{ fontSize: 26, lineHeight: 26 }}
              >
                #{ME_RANK}
              </Text>
              <Text
                className="font-sans font-bold"
                style={{
                  fontSize: 10.5,
                  letterSpacing: 0.63,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 3,
                }}
              >
                SIRA
              </Text>
            </View>
          </View>

          {/* Mini trend */}
          <View
            className="flex-row items-center"
            style={{
              marginTop: 14,
              padding: 12,
              gap: 12,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.28)',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold"
                style={{
                  fontSize: 10.5,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Son 10 maç
              </Text>
              <Text
                className="font-sans font-bold text-white"
                style={{ fontSize: 12.5, marginTop: 1 }}
              >
                Yükselişte · {lv.name}
              </Text>
            </View>
            <Sparkline data={ELO_TREND} color={colors.lime} w={104} h={30} stroke={2.5} />
          </View>

          {/* Level progress */}
          <View
            className="flex-row items-center"
            style={{ marginTop: 11, gap: 8 }}
          >
            <View
              style={{
                flex: 1,
                height: 5,
                borderRadius: 9999,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <View
                style={{
                  width: `${Math.round(lp.pct * 100)}%`,
                  height: '100%',
                  backgroundColor: colors.lime,
                }}
              />
            </View>
            <Text
              className="font-num font-bold"
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {lp.next ? `${lp.next.name}'e ${lp.toNext}` : 'Maks seviye'}
            </Text>
          </View>
        </View>

        {/* Yeni Maç + Sıralama CTA row */}
        <View className="flex-row" style={{ gap: 11, marginTop: -1 }}>
          <Pressable
            onPress={() => router.push('/match/new/type' as never)}
            className="flex-1 flex-row items-center justify-center bg-lime border-base border-border-strong"
            style={{ height: 56, gap: 9, borderRadius: 9999 }}
          >
            <Icon name="plus" size={22} color={colors.onLime} stroke={2.8} />
            <Text
              className="font-sans font-extrabold"
              style={{ fontSize: 15.5, color: colors.onLime }}
            >
              Yeni Maç
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/leaderboard' as never)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="ranking" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Aktif maçlar */}
        <SectionTitle
          action="Tümü"
          onActionPress={() => router.push('/(tabs)/matches' as never)}
        >
          Aktif maçlar
        </SectionTitle>
        <View style={{ gap: 10 }}>
          {ACTIVE_MATCHES.map((m) => (
            <ActiveMatchCard
              key={m.id}
              opp={m.opponentName}
              opponentId={m.opponentId}
              kind={m.kind}
              whenLabel={m.whenLabel}
            />
          ))}
        </View>

        {/* Son sonuçlar */}
        <SectionTitle
          action="Geçmiş"
          onActionPress={() => router.push('/match/history' as never)}
        >
          Son sonuçlar
        </SectionTitle>
        <View style={{ gap: 10 }}>
          {RECENT_MATCHES.map((m) => (
            <RecentMatchCard
              key={m.id}
              opp={m.opponentName}
              opponentId={m.opponentId}
              win={m.win}
              score={m.score}
              delta={m.delta}
              whenLabel={m.whenLabel}
            />
          ))}
        </View>

        {/* Sezon banner */}
        <Pressable
          onPress={() => router.push('/season' as never)}
          className="flex-row items-center bg-clay-softer border-base border-border-strong"
          style={{
            marginTop: 4,
            gap: 13,
            padding: 15,
            borderRadius: 26,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="trophy" size={23} color={colors.clayText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              className="font-sans font-extrabold text-text"
              style={{ fontSize: 14.5 }}
            >
              Güz Sezonu finali yaklaşıyor
            </Text>
            <Text
              className="font-sans font-semibold text-text-2"
              style={{ fontSize: 12, marginTop: 2 }}
            >
              İlk 8&apos;desin · finale{' '}
              <Text
                className="font-num font-extrabold"
                style={{ color: colors.clayText }}
              >
                {SEASON_DAYS_LEFT} gün
              </Text>{' '}
              kaldı
            </Text>
          </View>
          <Icon name="chevR" size={20} color={colors.text3} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Local subcomponents
// ---------------------------------------------------------------------------

interface SectionTitleProps {
  children: string;
  action?: string;
  onActionPress?: () => void;
}

function SectionTitle({ children, action, onActionPress }: SectionTitleProps) {
  return (
    <View
      className="flex-row items-baseline justify-between"
      style={{ marginTop: 16, paddingHorizontal: 4 }}
    >
      <Text
        className="font-display font-extrabold text-text"
        style={{ fontSize: 16, letterSpacing: -0.16 }}
      >
        {children}
      </Text>
      {action ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text
            className="font-sans font-bold text-text-3"
            style={{ fontSize: 12.5 }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface ActiveMatchCardProps {
  opp: string;
  opponentId: string;
  kind: 'ranking' | 'friendly';
  whenLabel: string;
}

function ActiveMatchCard({ opp, opponentId, kind, whenLabel }: ActiveMatchCardProps) {
  const ranked = kind === 'ranking';
  return (
    <Pressable
      onPress={() => router.push(`/user/${opponentId}` as never)}
      className="flex-row items-center bg-surface border-base border-border-strong"
      style={{
        padding: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderRadius: 18,
      }}
    >
      <Avatar name={opp} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-center" style={{ gap: 7 }}>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 14.5 }}
          >
            {opp}
          </Text>
          <View
            style={{
              backgroundColor: ranked ? colors.blueSoft : colors.pinkSoft,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 9999,
            }}
          >
            <Text
              className="font-sans font-extrabold"
              style={{
                fontSize: 9.5,
                letterSpacing: 0.48,
                color: ranked ? colors.court : colors.pinkDeep,
              }}
            >
              {ranked ? 'SIRALAMA' : 'DOSTLUK'}
            </Text>
          </View>
        </View>
        <Text
          className="font-sans font-semibold text-text-3"
          style={{ fontSize: 12, marginTop: 3 }}
        >
          {whenLabel}
        </Text>
      </View>
      <Icon name="chevR" size={20} color={colors.text3} />
    </Pressable>
  );
}

interface RecentMatchCardProps {
  opp: string;
  opponentId: string;
  win: boolean;
  score: string;
  delta: number;
  whenLabel: string;
}

function RecentMatchCard({
  opp,
  opponentId,
  win,
  score,
  delta,
  whenLabel,
}: RecentMatchCardProps) {
  const deltaPositive = delta >= 0;
  return (
    <Pressable
      onPress={() => router.push(`/user/${opponentId}` as never)}
      className="flex-row items-center bg-surface border-base border-border-strong"
      style={{
        padding: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderRadius: 18,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.borderStrong,
          backgroundColor: win ? colors.limeSoft : '#FCE6E4',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          className="font-sans font-extrabold"
          style={{ fontSize: 14, color: win ? colors.win : colors.loss }}
        >
          {win ? 'G' : 'M'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 14 }}
        >
          {opp}
        </Text>
        <Text
          className="font-sans font-semibold text-text-3"
          style={{ fontSize: 11.5, marginTop: 2 }}
        >
          {whenLabel}
        </Text>
      </View>
      <Text
        className="font-num font-extrabold text-text"
        style={{ fontSize: 18 }}
      >
        {score}
      </Text>
      <View
        className="flex-row items-center"
        style={{ gap: 1, minWidth: 38, justifyContent: 'flex-end' }}
      >
        <Icon
          name={deltaPositive ? 'chevU' : 'chevD'}
          size={13}
          color={deltaPositive ? colors.win : colors.loss}
          stroke={3}
        />
        <Text
          className="font-num font-bold"
          style={{
            fontSize: 13,
            color: deltaPositive ? colors.win : colors.loss,
          }}
        >
          {Math.abs(delta)}
        </Text>
      </View>
    </Pressable>
  );
}
