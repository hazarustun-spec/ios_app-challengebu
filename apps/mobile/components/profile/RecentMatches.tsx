// components/profile/RecentMatches.tsx
//
// "SON MAÇLAR" — the last N completed (confirmed / voided) matches for one
// player, rendered as the row cards the player preview has always used.
//
// Extracted from app/user/[userId].tsx so the OWN profile tab can show the
// same list without a second copy of the layout, and so both surfaces get
// the same empty state.
//
// Two things it does that the inline version did not:
//
//   1. Opponents are resolved relative to `userId` (the player whose profile
//      is on screen), not to the signed-in user. useOpponentNames() hardcodes
//      the viewer, so on someone else's profile every row used to fall back to
//      "team B" regardless of which side that player was actually on.
//   2. The viewer's own name is resolvable. usePlayers() strips the signed-in
//      user out of the roster, so a match between you and the player you are
//      looking at had no name for you — it rendered as "Rakip". The auth
//      store's profile summary fills that gap.
//
// Data: useUserMatchHistory(userId) — already limited to 20 rows server-side
// (status in confirmed/voided, ordered by played_at desc); we render the first
// `limit` of those.

import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useUserMatchHistory } from '../../hooks/use-match-history';
import { usePlayers } from '../../hooks/use-players';
import { DB_TO_UI_FORMAT, FORMATS } from '../../lib/formats';
import { formatOpponentName, myPerspective, opponentIds } from '../../lib/match-opponent';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';
import { Avatar } from '../ui/Avatar';

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

export interface RecentMatchesProps {
  /** Whose matches to list. Undefined while a route param is still resolving. */
  userId: string | undefined;
  /** How many rows to render. Default 5, capped by the hook's own 20-row query. */
  limit?: number;
  /** Section heading. Pass null to render the rows with no heading. */
  title?: string | null;
  /** Shown instead of the rows when the player has no completed match yet. */
  emptyText?: string;
}

export function RecentMatches({
  userId,
  limit = 5,
  title = 'SON MAÇLAR',
  emptyText = 'Henüz maç oynanmadı.',
}: RecentMatchesProps) {
  const historyQ = useUserMatchHistory(userId);
  const { data: players } = usePlayers();
  const myId = useAuthStore((s) => s.user?.id);
  const myProfile = useAuthStore((s) => s.profile);

  // user_id → { first_name, last_name }. usePlayers() drops the signed-in
  // user, so patch that one row back in from the auth store.
  const nameMap = useMemo(() => {
    const m = new Map<string, { first_name: string; last_name: string }>();
    for (const p of players ?? []) {
      m.set(p.user_id, { first_name: p.first_name, last_name: p.last_name });
    }
    if (myId && myProfile) {
      m.set(myId, {
        first_name: myProfile.firstName,
        last_name: myProfile.lastName,
      });
    }
    return m;
  }, [players, myId, myProfile]);

  const matches = (historyQ.data ?? []).slice(0, limit);

  const heading =
    title === null ? null : (
      <Text
        className="font-sans font-extrabold text-text-3"
        style={{ fontSize: 11, letterSpacing: 0.66, paddingLeft: 2 }}
      >
        {title}
      </Text>
    );

  if (historyQ.isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        {heading}
        <Text
          className="font-sans text-text-3"
          style={{ fontSize: 13, paddingLeft: 2, paddingVertical: 4 }}
        >
          {emptyText}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {heading}
      {matches.map((m) => {
        const perspective = myPerspective(m, userId ?? '');
        const isVoid = m.winner_team === 'void';
        const win = perspective.won === true;
        const score = `${perspective.myScore}-${perspective.oppScore}`;
        const delta = perspective.eloDelta ?? 0;

        const stripColor = isVoid ? colors.warn : win ? colors.win : colors.loss;

        const uiFormatKey = DB_TO_UI_FORMAT[m.format] ?? null;
        const fmt = uiFormatKey ? FORMATS.find((f) => f.key === uiFormatKey) : null;
        const fmtName = fmt?.name ?? m.format;
        const dateLabel = formatMatchDate(m.played_at);
        const catLabel = CATEGORY_LABELS[m.category] ?? m.category;

        // Opponents of the profile owner — not of the viewer.
        const oppIds = opponentIds(m, userId ?? '');
        const resolved = oppIds
          .map((id) => nameMap.get(id))
          .filter((p): p is { first_name: string; last_name: string } => !!p);
        const opponentLabel = resolved.length === 0 ? 'Rakip' : formatOpponentName(resolved);
        const primaryName = resolved[0]
          ? `${resolved[0].first_name} ${resolved[0].last_name}`
          : 'Rakip';

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
            <Avatar name={primaryName} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                {opponentLabel}
              </Text>
              <Text className="font-sans text-text-3" style={{ fontSize: 12, marginTop: 2 }}>
                {fmtName} · {catLabel} · {dateLabel}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text className="font-num font-bold text-text" style={{ fontSize: 17 }}>
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
  );
}
