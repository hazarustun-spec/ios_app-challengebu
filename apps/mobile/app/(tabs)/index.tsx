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

import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScreenEnter } from '../../components/ui/ScreenEnter';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { GreetHeader } from '../../components/ui/GreetHeader';
import { MessagesButton } from '../../components/ui/MessagesButton';
import { Icon, type IconName } from '../../components/ui/Icon';
// Sparkline removed — ELO hero now uses form-dots instead of a trend line.
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
import { FadeSlideIn } from '../../components/ui/FadeSlideIn';
import { shadows } from '../../theme/shadows';

// AnimatedTextInput drives the ELO hero count-up via reanimated (same pattern
// as result.tsx). Must be defined OUTSIDE the component so
// createAnimatedComponent only runs once per app session.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const ELO_NUM_FONT_FAMILY = 'SpaceGrotesk-ExtraBold';

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

  // ELO hero count-up: start 120 below ME_ELO, ease-out to exact value.
  // Hooks are always called (before the isLoading early return) per React rules.
  const eloCounter = useSharedValue(Math.max(1000, ME_ELO - 120));
  useEffect(() => {
    eloCounter.value = Math.max(1000, ME_ELO - 120);
    eloCounter.value = withTiming(ME_ELO, {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
    // eloCounter is a stable SharedValue ref — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ME_ELO]);
  const animatedEloProps = useAnimatedProps(
    () => ({ text: String(Math.round(eloCounter.value)) } as any),
  );

  // ELO delta chip entrance: fades + slides in from right ~820 ms after the
  // count-up starts so the eye reads "ELO → then the change".
  const deltaOpacity = useSharedValue(0);
  const deltaTranslateX = useSharedValue(10);
  useEffect(() => {
    deltaOpacity.value = 0;
    deltaTranslateX.value = 10;
    deltaOpacity.value = withDelay(820, withTiming(1, { duration: 380 }));
    deltaTranslateX.value = withDelay(
      820,
      withSpring(0, { damping: 18, stiffness: 200 }),
    );
    // deltaOpacity/deltaTranslateX are stable SharedValue refs — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ME_ELO]);
  const animatedDeltaStyle = useAnimatedStyle(() => ({
    opacity: deltaOpacity.value,
    transform: [{ translateX: deltaTranslateX.value }],
  }));

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

  // --- Win streak: consecutive most-recent confirmed wins (full history) ---
  const ALL_MATCHES = matchHistoryQ.data ?? [];
  const WIN_STREAK = (() => {
    if (!userId) return 0;
    let streak = 0;
    for (const m of ALL_MATCHES) {
      if (m.status === 'confirmed' && myPerspective(m, userId).won === true) {
        streak++;
      } else {
        break; // loss or voided match ends the streak
      }
    }
    return streak;
  })();

  // Form dots: last-5 match results for the hero panel (W/L/V).
  const FORM_DOTS: Array<'win' | 'loss' | 'void'> = userId
    ? ALL_MATCHES.slice(0, 5).map((m) => {
        const p = myPerspective(m, userId);
        if (p.won === true) return 'win';
        if (p.won === false) return 'loss';
        return 'void';
      })
    : [];

  // Flame icon looping pulse — active only when streak >= 3.
  const flameScale = useSharedValue(1);
  useEffect(() => {
    if (WIN_STREAK >= 3) {
      flameScale.value = withRepeat(
        withTiming(1.22, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true, // reverse (ping-pong)
      );
    } else {
      flameScale.value = withTiming(1, { duration: 300 });
    }
    // flameScale is a stable SharedValue ref — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WIN_STREAK]);
  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

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
          leftOfBell={<MessagesButton />}
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
        leftOfBell={<MessagesButton />}
      />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        {/* ELO HERO — flat, solid #2270BC, no gradient/shadow */}
        <View style={{ borderRadius: 34, padding: 26, backgroundColor: '#2270BC' }}>

          {/* Row 1: category label (left) + white level pill (right) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 12, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}
            >
              GÜNCEL ELO · {categoryHeroLabel}
            </Text>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: '#fff',
              }}
            >
              <Text
                className="font-sans font-extrabold"
                style={{ fontSize: 11, color: '#161618' }}
              >
                {lv.name.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Row 2: big ELO number + white delta chip */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 }}>
            <AnimatedTextInput
              editable={false}
              underlineColorAndroid="transparent"
              value={String(ME_ELO)}
              animatedProps={animatedEloProps}
              style={{
                fontSize: 58,
                lineHeight: 62,
                letterSpacing: -2.3,
                color: '#FFFFFF',
                fontFamily: ELO_NUM_FONT_FAMILY,
                fontWeight: '800',
                padding: 0,
                margin: 0,
                includeFontPadding: false,
                backgroundColor: 'transparent',
              }}
            />
            <Animated.View style={[{ marginBottom: 14 }, animatedDeltaStyle]}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  borderRadius: 9,
                  backgroundColor: '#fff',
                }}
              >
                <Icon
                  name={deltaPositiveHero ? 'chevU' : 'chevD'}
                  size={13}
                  color="#161618"
                  stroke={3}
                />
                <Text
                  className="font-num font-bold"
                  style={{ fontSize: 14, color: '#161618' }}
                >
                  {Math.abs(ELO_DELTA)}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* SON 10 MAÇ — darker blue inner panel with form dots */}
          <View
            style={{
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
              paddingHorizontal: 18,
              borderRadius: 18,
              backgroundColor: '#1B5EA0',
            }}
          >
            <View>
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 11, letterSpacing: 0.9, color: 'rgba(255,255,255,0.6)' }}
              >
                SON 10 MAÇ
              </Text>
              <Text
                className="font-sans font-bold text-white"
                style={{ fontSize: 17, marginTop: 3 }}
              >
                {FORM_DOTS.length === 0
                  ? 'Henüz maç yok'
                  : `${ELO_DELTA > 0 ? 'Yükselişte' : ELO_DELTA < 0 ? 'Düşüşte' : 'İstikrarlı'}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {FORM_DOTS.map((result, i) => (
                <View
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor:
                      result === 'win' ? '#8FD43B' : result === 'loss' ? '#E5484D' : '#F5B924',
                  }}
                />
              ))}
            </View>
          </View>

          {/* Progress to next level */}
          <View style={{ marginTop: 20 }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}
            >
              <Text
                className="font-sans font-semibold"
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}
              >
                {lp.next ? `${lp.next.name}'e ilerleme` : 'Maks seviye'}
              </Text>
              {lp.next ? (
                <Text
                  className="font-sans font-extrabold text-white"
                  style={{ fontSize: 12 }}
                >
                  {lp.toNext} PUAN KALDI
                </Text>
              ) : null}
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: '#13497F' }}>
              <View
                style={{
                  width: `${Math.round(lp.pct * 100)}%`,
                  height: '100%',
                  borderRadius: 5,
                  backgroundColor: '#fff',
                }}
              />
            </View>
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
