// Anasayfa (Home) — Plan 8 Phase E2, wired to live data (E-polish pass).
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
// Live-data sources:
//   - ELO hero (rating, rank, delta, trend): useMyRankings + useEloHistory
//   - Active matches: useActiveMatches  (status: awaiting_confirmation | disputed)
//   - Recent matches: useMyMatchHistory (status: confirmed | voided, latest 2)
//   - Season banner: useCurrentSeason  (days to finale_starts_at)
//   - Unread bell: useUnreadCount
//   - Display name: useAuthStore.profile

import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenEnter } from '../../components/ui/ScreenEnter';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { GreetHeader } from '../../components/ui/GreetHeader';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Sparkline } from '../../components/ui/Sparkline';
import { OpponentSuggestStrip } from '../../components/matches/OpponentSuggestStrip';
import { useActiveMatches, type ActiveMatchRow } from '../../hooks/use-active-matches';
import { useEloHistory } from '../../hooks/use-elo-history';
import { useMyMatchHistory } from '../../hooks/use-match-history';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useUnreadCount } from '../../hooks/use-unread-count';
import { useOpponentNames } from '../../hooks/use-opponent-names';
import { myPerspective } from '../../lib/match-opponent';
import { levelForElo, levelProgress } from '../../lib/levels';
import { useAuthStore } from '../../stores/auth-store';
import { useMyProfile } from '../../hooks/use-profile';
import { defaultCategoryForGender } from '../../lib/primary-category';
import { colors } from '../../theme/colors';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FadeSlideIn } from '../../components/ui/FadeSlideIn';
import { shadows } from '../../theme/shadows';

// ---------------------------------------------------------------------------
// Category label map — mirrors the convention used across the codebase.
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'ERKEK TEK',
  kadin_tek: 'KADIN TEK',
  open_tek: 'OPEN TEK',
  erkek_cift: 'ERKEK ÇİFT',
  kadin_cift: 'KADIN ÇİFT',
  karma_cift: 'KARMA ÇİFT',
  open_cift: 'OPEN ÇİFT',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick the "primary" ranking row to show in the hero.
 *  Priority: erkek_tek > kadin_tek > open_tek > first row returned. */
function pickPrimaryCategory(rows: { category: string; rating: number; rank: number }[]) {
  const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
  for (const cat of ORDER) {
    const row = rows.find((r) => r.category === cat);
    if (row) return row;
  }
  return rows[0] ?? null;
}

/** Format played_at date relative to today ("Bugün 18:30", "Dün", "3 gün önce"). */
function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) {
    const hhmm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `Bugün ${hhmm}`;
  }
  if (d >= startOfYesterday) return 'Dün';
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffDays} gün önce`;
}

/** Days until a future ISO date string (negative if in the past). */
function daysUntil(isoTarget: string): number {
  const now = new Date();
  const target = new Date(isoTarget);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const { data: unreadCount = 0 } = useUnreadCount();
  const displayName = profile?.firstName ?? 'Oyuncu';

  // Full profile for gender_category — used to pick the right default category
  // when the user has no ranking rows yet (new user scenario).
  const myProfileQ = useMyProfile();
  const genderCategory = myProfileQ.data?.gender_category ?? null;

  // --- ELO hero data ---
  const rankingsQ = useMyRankings();
  const eloHistoryQ = useEloHistory(userId);

  const rankings = rankingsQ.data ?? [];
  const primaryRanking = pickPrimaryCategory(rankings);
  const primaryCat = primaryRanking?.category ?? defaultCategoryForGender(genderCategory);
  const ME_ELO = primaryRanking?.rating ?? 1200;
  const ME_RANK = primaryRanking?.rank ?? 0;

  // ELO trend (last 10 points in primary category)
  const catPoints = (eloHistoryQ.data?.byCategory ?? {})[primaryCat] ?? [];
  const ELO_TREND: number[] =
    catPoints.length > 0
      ? catPoints.slice(-10).map((p) => p.elo)
      : [ME_ELO]; // single-point fallback keeps the sparkline stable

  // ELO delta: difference between the most recent point's elo and eloBefore
  const latestPoint = catPoints.length > 0 ? catPoints[catPoints.length - 1] : null;
  const ELO_DELTA = latestPoint ? latestPoint.elo - latestPoint.eloBefore : 0;
  const deltaPositiveHero = ELO_DELTA >= 0;

  const lv = levelForElo(ME_ELO);
  const lp = levelProgress(ME_ELO);

  // --- Season banner ---
  const seasonQ = useCurrentSeason();
  const season = seasonQ.data;
  const SEASON_DAYS_LEFT =
    season?.finale_starts_at ? Math.max(0, daysUntil(season.finale_starts_at)) : null;

  // --- Active matches ---
  const activeMatchesQ = useActiveMatches();
  const ACTIVE_MATCHES: ActiveMatchRow[] = activeMatchesQ.data ?? [];

  // --- Recent matches (last 2 confirmed/voided) ---
  const matchHistoryQ = useMyMatchHistory();
  const RECENT_MATCHES: ActiveMatchRow[] = (matchHistoryQ.data ?? []).slice(0, 2);

  // --- Opponent name resolver (single roster fetch, shared across all cards) ---
  const opponentNames = useOpponentNames();

  const categoryHeroLabel = CATEGORY_LABELS[primaryCat] ?? primaryCat.toUpperCase();

  // --- Loading skeleton (shown on first data fetch) ---
  if (rankingsQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <GreetHeader
          name={displayName}
          sub="Bugün maç günü mü?"
          unreadCount={unreadCount}
          onBellPress={() => router.push('/notifications')}
        />
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 24, gap: 14 }}
          scrollEnabled={false}
        >
          {/* ELO hero card */}
          <Skeleton height={150} radius={26} />
          {/* CTA row — pill button + circle icon button */}
          <View style={{ flexDirection: 'row', gap: 11, marginTop: -1 }}>
            <Skeleton height={56} radius={9999} style={{ flex: 1 }} />
            <Skeleton width={56} height={56} radius={28} />
          </View>
          {/* Opponent strip section title + strip */}
          <Skeleton height={16} width={'45%'} radius={6} style={{ marginTop: 16 }} />
          <Skeleton height={56} radius={18} />
          {/* Active matches section */}
          <Skeleton height={16} width={'55%'} radius={6} style={{ marginTop: 16 }} />
          <Skeleton height={72} radius={18} />
          <Skeleton height={72} radius={18} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScreenEnter className="flex-1 bg-bg">
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
          style={{
            borderRadius: 26,
            padding: 18,
            overflow: 'hidden',
            // Court-blue tinted glow — the card visibly lifts + glows.
            shadowColor: '#1E63A8',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 22,
            elevation: 10,
          }}
        >
          {/* Rich diagonal court gradient: bright top-left → deep bottom-right. */}
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="eloHeroGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#3C97E6" stopOpacity={1} />
                  <Stop offset="0.5" stopColor="#2575C2" stopOpacity={1} />
                  <Stop offset="1" stopColor="#174E8C" stopOpacity={1} />
                </LinearGradient>
                <LinearGradient id="eloHeroSheen" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
                  <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#eloHeroGrad)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#eloHeroSheen)" />
            </Svg>
          </View>
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
                GÜNCEL ELO · {categoryHeroLabel}
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
                  <Icon
                    name={deltaPositiveHero ? 'chevU' : 'chevD'}
                    size={14}
                    color={deltaPositiveHero ? colors.lime : '#FF8A80'}
                    stroke={3}
                  />
                  <Text
                    className="font-num font-extrabold"
                    style={{ fontSize: 14, color: deltaPositiveHero ? colors.lime : '#FF8A80' }}
                  >
                    {Math.abs(ELO_DELTA)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {ME_RANK > 0 ? (
                <>
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
                </>
              ) : (
                <Text
                  className="font-sans font-bold"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 0.63,
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 3,
                  }}
                >
                  —
                </Text>
              )}
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
                {ELO_DELTA > 0 ? 'Yükselişte' : ELO_DELTA < 0 ? 'Düşüşte' : 'Sabit'} · {lv.name}
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
            onPress={() => router.push('/(tabs)/leaderboard' as never)}
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

        {/* Sana uygun rakipler — compact strip (top 3).
            Uses primaryCat derived from the user's own rankings (same variable
            that drives the ELO hero above). Falls back to erkek_tek when no
            ranking row exists yet (same fallback chain as pickPrimaryCategory). */}
        <SectionTitle>Sana uygun rakipler</SectionTitle>
        <OpponentSuggestStrip category={primaryCat} variant="compact" />

        {/* Aktif maçlar */}
        <SectionTitle
          action="Tümü"
          onActionPress={() => router.push('/(tabs)/matches' as never)}
        >
          Aktif maçlar
        </SectionTitle>
        {ACTIVE_MATCHES.length === 0 ? (
          <SectionEmpty icon="calendar" text="Henüz aktif maçın yok." />
        ) : (
          <View style={{ gap: 10 }}>
            {ACTIVE_MATCHES.map((m, i) => (
              <FadeSlideIn key={m.id} index={i}>
                <ActiveMatchCard
                  match={m}
                  myUserId={userId ?? ''}
                  resolveOpponent={opponentNames.resolve}
                />
              </FadeSlideIn>
            ))}
          </View>
        )}

        {/* Son sonuçlar */}
        <SectionTitle
          action="Geçmiş"
          onActionPress={() => router.push('/match/history' as never)}
        >
          Son sonuçlar
        </SectionTitle>
        {RECENT_MATCHES.length === 0 ? (
          <SectionEmpty icon="trophy" text="Henüz tamamlanmış maçın yok." />
        ) : (
          <View style={{ gap: 10 }}>
            {RECENT_MATCHES.map((m, i) => (
              <FadeSlideIn key={m.id} index={i}>
                <RecentMatchCard
                  match={m}
                  myUserId={userId ?? ''}
                  resolveOpponent={opponentNames.resolve}
                />
              </FadeSlideIn>
            ))}
          </View>
        )}

        {/* Sezon banner — only shown when season data is available */}
        {season && SEASON_DAYS_LEFT !== null && (
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
                finale{' '}
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
        )}
      </ScrollView>
    </ScreenEnter>
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

// Compact inline empty for a home section (the full-screen EmptyState uses
// flex-1 and doesn't lay out inside a scroll section).
function SectionEmpty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View
      className="flex-row items-center rounded-lg"
      style={{
        gap: 11,
        padding: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface2,
        }}
      >
        <Icon name={icon} size={16} color={colors.text3} />
      </View>
      <Text className="font-sans text-text-2" style={{ fontSize: 13, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ActiveMatchCard
// ---------------------------------------------------------------------------
// The ActiveMatchRow has team_a_player_ids / team_b_player_ids (UUID arrays)
// but no participant names. Fetching names per-card would be N+1 profile
// queries; instead we show the match category + court/time as the primary
// label and use Avatar initials from the opponent ID string (yields a
// consistent deterministic color but shows "?" initials). Navigates to the
// real match detail screen via the match's own ID.

interface ActiveMatchCardProps {
  match: ActiveMatchRow;
  myUserId: string;
  resolveOpponent: (match: ActiveMatchRow) => { ids: string[]; name: string; primaryId: string | null; primaryName: string };
}

function ActiveMatchCard({ match, myUserId: _myUserId, resolveOpponent }: ActiveMatchCardProps) {
  const ranked = match.is_rated;
  const courtLabel = match.court?.name ? ` · ${match.court.name}` : '';
  const playedAt = new Date(match.played_at);
  const timeStr = playedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = relativeDate(match.played_at);
  const whenLabel = `${dateStr} ${timeStr}${courtLabel}`;

  const opponent = resolveOpponent(match);

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}` as never)}
      className="flex-row items-center bg-surface border-base border-border-strong"
      style={{
        padding: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderRadius: 18,
        ...shadows.md,
      }}
    >
      <Avatar name={opponent.primaryName} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-center" style={{ gap: 7 }}>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 14.5 }}
          >
            {opponent.name}
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

// ---------------------------------------------------------------------------
// RecentMatchCard
// ---------------------------------------------------------------------------
// Same note as above: no participant names in the match row. We derive
// win/loss from winner_team vs myUserId's team, score from score_team_a/b,
// and delta from rating_after - rating_before for the user's team.

interface RecentMatchCardProps {
  match: ActiveMatchRow;
  myUserId: string;
  resolveOpponent: (match: ActiveMatchRow) => { ids: string[]; name: string; primaryId: string | null; primaryName: string };
}

function RecentMatchCard({ match, myUserId, resolveOpponent }: RecentMatchCardProps) {
  const perspective = myPerspective(match, myUserId);
  const win = perspective.won === true;
  const score = `${perspective.myScore}-${perspective.oppScore}`;
  const delta = perspective.eloDelta ?? 0;
  const deltaPositive = delta >= 0;

  const whenLabel = relativeDate(match.played_at);

  const opponent = resolveOpponent(match);

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}` as never)}
      className="flex-row items-center bg-surface border-base border-border-strong"
      style={{
        padding: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderRadius: 18,
        ...shadows.md,
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
          {opponent.name}
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
