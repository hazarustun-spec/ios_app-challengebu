// Geçmiş Maçlar (Match History) — Plan 8 Phase E16, wired to live data.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`MatchHistory`)
//
// Screen layout:
//
//   1. NavHeader with back
//   2. Stat strip — 3 surface-2 chips: Galibiyet / Mağlubiyet / Oran
//   3. History list — one row per finalized match with:
//        · left color strip (win=green, loss=red, void=warn)
//        · avatar + opponent + format/date subtitle
//        · trailing score + Δelo (or "voided")
//      Tapping a row navigates to /match/[id].
//
// Live-data sources:
//   - Match list: useMyMatchHistory (status: confirmed | voided)
//   - Opponent names: useOpponentNames().resolve(match)
//   - Win/score/delta: myPerspective(match, myUserId) from lib/match-opponent

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { FORMATS, DB_TO_UI_FORMAT } from '../../lib/formats';
import { myPerspective } from '../../lib/match-opponent';
import { useMyMatchHistory } from '../../hooks/use-match-history';
import { useOpponentNames } from '../../hooks/use-opponent-names';
import { useAuthStore } from '../../stores/auth-store';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
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

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function MatchHistory() {
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const historyQ = useMyMatchHistory();
  const opponentNames = useOpponentNames();

  const matches: ActiveMatchRow[] = historyQ.data ?? [];

  // Compute stat strip from live data
  const wins = matches.filter((m) => {
    if (m.winner_team === 'void' || m.winner_team === null) return false;
    const p = myPerspective(m, userId);
    return p.won === true;
  }).length;
  const losses = matches.filter((m) => {
    if (m.winner_team === 'void' || m.winner_team === null) return false;
    const p = myPerspective(m, userId);
    return p.won === false;
  }).length;
  const decided = wins + losses;
  const winRate = decided > 0 ? `${Math.round((wins / decided) * 100)}%` : '—';

  const header = (
    <NavHeader
      title="Geçmiş Maçlar"
      onBack={() => router.back()}
    />
  );

  if (historyQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="trophy"
          title="Henüz geçmiş maç yok"
          body="Tamamlanan maçların burada görünecek."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={historyQ.isRefetching}
            onRefresh={() => historyQ.refetch()}
            tintColor={colors.clay}
          />
        }
      >
        {/* Stat strip */}
        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              [String(wins), 'Galibiyet', colors.win],
              [String(losses), 'Mağlubiyet', colors.loss],
              [winRate, 'Oran', colors.text],
            ] as const
          ).map(([v, l, c]) => (
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
                className="font-num font-extrabold"
                style={{ fontSize: 21, color: c }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 11 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* History rows */}
        <View style={{ gap: 8 }}>
          {matches.map((m) => {
            const perspective = myPerspective(m, userId);
            const isVoid = m.winner_team === 'void';
            const win = perspective.won === true;
            const score = `${perspective.myScore}-${perspective.oppScore}`;
            const delta = perspective.eloDelta ?? 0;

            const stripColor = isVoid
              ? colors.warn
              : win
                ? colors.win
                : colors.loss;

            // Convert DB format enum to UI key for FORMATS lookup
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
                className="flex-row items-center bg-surface rounded-md border-base border-border-strong"
                style={{ padding: 12, paddingHorizontal: 14, gap: 12 }}
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
                    {/* A void has two very different causes and the user can
                        only act on one of them. 'Oynanmadı' is written by
                        void_unplayed_matches() (20260805000001) when nobody
                        submitted a score; anything else is a real void
                        (disputed, admin-annulled). The old label printed the
                        raw enum value, in English. */}
                    {isVoid
                      ? m.voided_reason === 'Oynanmadı'
                        ? 'Oynanmadı'
                        : 'Geçersiz'
                      : `${delta > 0 ? '+' : ''}${delta}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
