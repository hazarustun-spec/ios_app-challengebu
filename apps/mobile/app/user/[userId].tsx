// apps/mobile/app/user/[userId].tsx — Plan 8 Phase F (F6), live-wired.
//
// Other-player preview at `/user/[userId]`. Wired to live Supabase data via:
//   - useOtherPlayerProfile(userId)  — hero (name, pronoun, dept, status)
//   - useUserRankings(userId)        — ELO / rank per category
//   - useUserMatchHistory(userId)    — recent confirmed matches
//   - useHeadToHead(userId)          — head-to-head record vs. current user
//   - useOpponentNames()             — opponent names in match rows
//
// Hero stack (avatar + name + pronoun chip + level chip + dept/year),
// 2×2 stats grid (rank/wins/losses/H2H), ELO card, optional frozen banner,
// recent match rows, and a sticky footer with "Meydan oku" CTA.
//
// The "Meydan oku" CTA prefills the new-match store's `opponent` field and
// pushes to `/match/new/detail` so the wizard lands on detail with the
// opponent already chosen.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { levelForElo } from '../../lib/levels';
import { myPerspective } from '../../lib/match-opponent';
import { FORMATS, DB_TO_UI_FORMAT } from '../../lib/formats';
import { useNewMatchStore } from '../../stores/new-match-store';
import { useOtherPlayerProfile } from '../../hooks/use-other-player-profile';
import { useUserRankings } from '../../hooks/use-my-rankings';
import { useUserMatchHistory } from '../../hooks/use-match-history';
import { useHeadToHead } from '../../hooks/use-head-to-head';
import { useOpponentNames } from '../../hooks/use-opponent-names';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/** Pick the "primary" ranking row for the hero ELO chip.
 *  Priority: erkek_tek > kadin_tek > open_tek > first row returned. */
function pickPrimaryRanking(rows: { category: string; rating: number; rank: number }[]) {
  const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
  for (const cat of ORDER) {
    const row = rows.find((r) => r.category === cat);
    if (row) return row;
  }
  return rows[0] ?? null;
}

/** Resolve the department name from the nested departments field. */
function getDeptName(
  departments: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!departments) return null;
  if (Array.isArray(departments)) return departments[0]?.name ?? null;
  return departments.name ?? null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PlayerPreview() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const setField = useNewMatchStore((s) => s.setField);

  const profileQ = useOtherPlayerProfile(userId);
  const rankingsQ = useUserRankings(userId);
  const historyQ = useUserMatchHistory(userId);
  const h2hQ = useHeadToHead(userId);
  const opponentNames = useOpponentNames();

  const p = profileQ.data;
  const rankings = rankingsQ.data ?? [];
  const matches = historyQ.data ?? [];
  const h2h = h2hQ.data ?? { totalMatches: 0, myWins: 0, theirWins: 0 };

  const isLoading = profileQ.isLoading;
  const isError = profileQ.isError;

  const refetchAll = () => {
    profileQ.refetch();
    rankingsQ.refetch();
    historyQ.refetch();
    h2hQ.refetch();
  };

  // Derived display values — safe defaults while loading
  const name = p ? `${p.first_name} ${p.last_name}`.trim() : '…';
  const pronoun = p?.pronoun ?? null;
  const frozen = p?.status === 'frozen_30';
  const deptName = p ? getDeptName(p.departments) : null;
  const showDept = p?.show_department && deptName;
  const showYear = p?.show_class_year && p?.class_year;

  const primaryRanking = pickPrimaryRanking(rankings);
  const primaryElo = primaryRanking?.rating ?? 1200;
  const primaryRank = primaryRanking?.rank ?? null;
  const lv = levelForElo(primaryElo);

  // Win / loss from the other player's perspective (using their userId)
  const wins = matches.filter((m) => {
    if (m.winner_team === 'void' || m.winner_team === null) return false;
    const persp = myPerspective(m, userId ?? '');
    return persp.won === true;
  }).length;
  const losses = matches.filter((m) => {
    if (m.winner_team === 'void' || m.winner_team === null) return false;
    const persp = myPerspective(m, userId ?? '');
    return persp.won === false;
  }).length;

  // H2H label: "X-Y" where X = their wins vs me, Y = my wins vs them
  const h2hLabel = h2hQ.isLoading
    ? '…'
    : h2h.totalMatches === 0
    ? '—'
    : `${h2h.theirWins}-${h2h.myWins}`;

  const meydanOku = () => {
    setField('opponent', {
      userId: userId ?? '',
      name,
      elo: primaryElo,
    });
    router.push('/match/new/detail' as never);
  };

  const header = (
    <NavHeader title="Oyuncu" onBack={() => router.back()} close />
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

  if (isError || !p) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="user"
          title="Oyuncu bulunamadı"
          body="Bu oyuncunun profili görüntülenemiyor."
          action="Geri dön"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching || rankingsQ.isRefetching}
            onRefresh={refetchAll}
            tintColor={colors.clay}
          />
        }
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 6 }}>
          <Avatar name={name} size={92} ring={lv.color} />
          <View
            className="flex-row items-center"
            style={{ gap: 8, marginTop: 4 }}
          >
            <Text
              className="font-display font-extrabold text-text"
              style={{ fontSize: 23, letterSpacing: -0.46 }}
            >
              {name}
            </Text>
          </View>
          <View
            className="flex-row items-center"
            style={{ gap: 8 }}
          >
            {pronoun && (
              <View
                className="bg-surface-2 rounded-pill"
                style={{ paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <Text
                  className="font-sans font-semibold"
                  style={{ fontSize: 12, color: colors.text3 }}
                >
                  {pronoun === 'other' ? (p.pronoun_custom ?? pronoun) : pronoun}
                </Text>
              </View>
            )}
            <View
              className="flex-row items-center"
              style={{ gap: 5 }}
            >
              <LevelIcon level={lv} size={16} />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13.5, color: lv.color }}
              >
                {lv.name}
              </Text>
            </View>
          </View>
          {(showDept || showYear) && (
            <Text
              className="font-sans"
              style={{ fontSize: 13, color: colors.text2 }}
            >
              {[showDept ? deptName : null, showYear ? `${p.class_year}. sınıf` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>

        {/* Stats 2x2 row */}
        <View
          className="flex-row"
          style={{ gap: 8, marginTop: 12 }}
        >
          {(
            [
              ['Rank', primaryRank !== null ? `#${primaryRank}` : '—'],
              ['Galibiyet', String(wins)],
              ['Mağlubiyet', String(losses)],
              ['H2H', h2hLabel],
            ] as const
          ).map(([l, v]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderRadius: 18,
                padding: 12,
                paddingHorizontal: 4,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-bold text-text"
                style={{ fontSize: 19 }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold"
                style={{ fontSize: 11, marginTop: 2, color: colors.text3 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* ELO card */}
        {primaryRanking && (
          <View
            className="flex-row items-center justify-between bg-surface rounded-md"
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: colors.borderStrong,
            }}
          >
            <View>
              <Text
                className="font-sans font-semibold"
                style={{ fontSize: 12.5, color: colors.text3 }}
              >
                {CATEGORY_LABELS[primaryRanking.category] ?? primaryRanking.category} · ELO
              </Text>
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 26, color: lv.color }}
              >
                {primaryRanking.rating}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 9999,
                backgroundColor: colors.surface2,
              }}
            >
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 13.5, color: colors.text3 }}
              >
                #{primaryRanking.rank}
              </Text>
            </View>
          </View>
        )}

        {/* Frozen banner */}
        {frozen && (
          <View
            className="flex-row bg-frozen-soft rounded-md"
            style={{ padding: 13, gap: 10 }}
          >
            <Icon name="snow" size={18} color={colors.frozen} />
            <Text
              className="font-sans"
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                color: colors.text2,
              }}
            >
              Bu oyuncu{' '}
              <Text className="font-bold">donmuş</Text> durumda (30+ gündür
              inaktif). Meydan okuman onu yeniden aktifleştirir.
            </Text>
          </View>
        )}

        {/* H2H summary card */}
        {h2h.totalMatches > 0 && (
          <View
            className="bg-surface rounded-md"
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              gap: 4,
            }}
          >
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66 }}
            >
              KARŞILAŞTIRMALARIMIZDAKİ SKOR
            </Text>
            <View className="flex-row items-center" style={{ gap: 12, marginTop: 4 }}>
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 26 }}
              >
                {h2h.theirWins}
              </Text>
              <Text
                className="font-sans font-bold text-text-3"
                style={{ fontSize: 14 }}
              >
                –
              </Text>
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 26 }}
              >
                {h2h.myWins}
              </Text>
              <Text
                className="font-sans text-text-3"
                style={{ fontSize: 12.5, flex: 1 }}
              >
                {h2h.totalMatches} maç oynandı
              </Text>
            </View>
          </View>
        )}

        {/* Recent match history */}
        {historyQ.isLoading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator color={colors.clay} />
          </View>
        ) : matches.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 11, letterSpacing: 0.66, paddingLeft: 2 }}
            >
              SON MAÇLAR
            </Text>
            {matches.slice(0, 5).map((m) => {
              const perspective = myPerspective(m, userId ?? '');
              const isVoid = m.winner_team === 'void';
              const win = perspective.won === true;
              const score = `${perspective.myScore}-${perspective.oppScore}`;
              const delta = perspective.eloDelta ?? 0;

              const stripColor = isVoid
                ? colors.warn
                : win
                  ? colors.win
                  : colors.loss;

              const uiFormatKey = DB_TO_UI_FORMAT[m.format] ?? null;
              const fmt = uiFormatKey ? FORMATS.find((f) => f.key === uiFormatKey) : null;
              const fmtName = fmt?.name ?? m.format;
              const dateLabel = formatMatchDate(m.played_at);
              const catLabel = CATEGORY_LABELS[m.category] ?? m.category;
              const opponent = opponentNames.resolve(m);

              return (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/match/${m.id}` as never)}
                  className="flex-row items-center bg-surface rounded-md"
                  style={{
                    padding: 12,
                    paddingHorizontal: 14,
                    gap: 12,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      alignSelf: 'stretch',
                      borderRadius: 3,
                      backgroundColor: stripColor,
                    }}
                  />
                  <Avatar name={opponent.primaryName} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      className="font-sans font-bold text-text"
                      style={{ fontSize: 14.5 }}
                    >
                      {opponent.name}
                    </Text>
                    <Text
                      className="font-sans text-text-3"
                      style={{ fontSize: 12, marginTop: 2 }}
                    >
                      {fmtName} · {catLabel} · {dateLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      className="font-num font-bold text-text"
                      style={{ fontSize: 17 }}
                    >
                      {score}
                    </Text>
                    <Text
                      className="font-num font-bold"
                      style={{
                        fontSize: 12,
                        marginTop: 1,
                        color: isVoid
                          ? colors.warn
                          : delta > 0
                            ? colors.win
                            : delta < 0
                              ? colors.loss
                              : colors.text3,
                      }}
                    >
                      {isVoid ? 'voided' : `${delta > 0 ? '+' : ''}${delta}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{ padding: 20, flexDirection: 'row', gap: 10 }}
      >
        <View style={{ flex: 1 }}>
          <Button
            size="lg"
            variant="secondary"
            full
            icon={<Icon name="user" size={17} color={colors.text} />}
            onPress={() => {
              router.push(`/(tabs)/profile` as never);
            }}
          >
            Profil
          </Button>
        </View>
        <View style={{ flex: 2 }}>
          <Button
            size="lg"
            full
            icon={<Icon name="bolt" size={17} color={colors.onLime} />}
            onPress={meydanOku}
          >
            Meydan oku
          </Button>
        </View>
      </View>
    </View>
  );
}
