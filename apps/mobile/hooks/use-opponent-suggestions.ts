// hooks/use-opponent-suggestions.ts — Top-5 opponent suggestions for a given category.
//
// Feeds the pure scorer `lib/opponent-suggest.ts` with live data:
//   - My ELO rating for the category    → useMyRankings()
//   - My userId                         → useAuthStore
//   - My availability_windows           → public_profiles (my own row)
//   - Candidate roster + availability   → public_profiles (active, gender-filtered)
//   - Candidate ELO for category        → useLadder(category).ratingOf(userId)
//   - Days since last match vs each     → useMyMatchHistory()
//   - Blocked users                     → empty set for now (table ships later)

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import { useMyRankings } from './use-my-rankings';
import { useLadder } from './use-ladder';
import { useMyMatchHistory } from './use-match-history';
import { opponentIds } from '../lib/match-opponent';
import { scoreCandidates } from '../lib/opponent-suggest';

// ─── Category → gender filter ──────────────────────────────────────────────
// Mirrors categoryToGender() in app/match/new/opponent.tsx. Replicated here
// to avoid importing from a screen file.
type GenderFilter = 'erkek' | 'kadin' | 'open_only';
function categoryToGender(category: string): GenderFilter | undefined {
  if (category.startsWith('erkek_')) return 'erkek';
  if (category.startsWith('kadin_')) return 'kadin';
  // open_* and karma_* categories include all genders — no filter.
  return undefined;
}

// ─── Profile row shape fetched from public_profiles ───────────────────────
interface ProfileRow {
  user_id: string;
  first_name: string;
  last_name: string;
  gender_category: string;
  availability_windows: string[] | null;
  status: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export interface SuggestionItem {
  userId: string;
  name: string;
  rating: number;
  score: number;
}

export function useOpponentSuggestions(category: string): {
  suggestions: SuggestionItem[];
  isLoading: boolean;
} {
  const myUserId = useAuthStore((s) => s.user?.id);

  // 1. My ELO ranking row for this category.
  const { data: rankingRows, isLoading: rankingsLoading } = useMyRankings();

  // 2. Category ladder — supplies ratingOf(candidateUserId).
  const { rows: ladderRows, isLoading: ladderLoading, ratingOf } = useLadder(category);

  // 3. My match history — used to compute playedDaysAgo per candidate.
  const { data: historyRows, isLoading: historyLoading } = useMyMatchHistory();

  // 4. Active public profiles for this category's eligible gender.
  //    Also includes my own row so we can read my availability_windows.
  const gender = category ? categoryToGender(category) : undefined;
  const profilesQuery = useQuery<ProfileRow[]>({
    queryKey: queryKeys.suggestions.byCategory(category),
    queryFn: async () => {
      if (!category) return [];
      let q = supabase
        .from('public_profiles')
        .select('user_id, first_name, last_name, gender_category, availability_windows, status')
        .eq('status', 'active');
      // For gendered categories restrict to matching gender_category.
      // open_only players are eligible for all open/karma categories.
      if (gender === 'erkek') {
        q = q.in('gender_category', ['erkek', 'open_only']);
      } else if (gender === 'kadin') {
        q = q.in('gender_category', ['kadin', 'open_only']);
      }
      // For open/karma categories (no gender filter) we load everyone.
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    enabled: !!category,
  });

  const isLoading =
    rankingsLoading ||
    ladderLoading ||
    historyLoading ||
    profilesQuery.isLoading;

  const suggestions = useMemo<SuggestionItem[]>(() => {
    // Guard: wait until all data sources are ready.
    if (!myUserId || !rankingRows || !historyRows || !profilesQuery.data) {
      return [];
    }

    // ── My ELO for this category ────────────────────────────────────────
    const myRankingRow =
      rankingRows.find((r) => r.category === category) ?? rankingRows[0];
    if (!myRankingRow) return []; // No ranking at all yet — nothing meaningful to suggest.
    const myRating = myRankingRow.rating;

    // ── My availability_windows (from my own profile row) ────────────────
    // availability_windows is stored as text[] in the DB with values like
    // 'weekday_morning', 'weekday_evening', etc. — already a string[].
    const myProfileRow = profilesQuery.data.find((p) => p.user_id === myUserId);
    const myAvailability: string[] = myProfileRow?.availability_windows ?? [];

    // ── Build playedDaysAgo lookup per opponent userId ───────────────────
    // useMyMatchHistory returns up to 20 confirmed/voided matches ordered
    // by played_at descending — so the first match found for a given opponent
    // is already the most recent.
    const now = Date.now();
    const lastPlayedMap = new Map<string, number>(); // userId → days ago
    for (const match of historyRows) {
      const opponents = opponentIds(match, myUserId);
      for (const oppId of opponents) {
        if (!lastPlayedMap.has(oppId) && match.played_at) {
          const daysAgo = Math.floor(
            (now - new Date(match.played_at).getTime()) / 86_400_000,
          );
          lastPlayedMap.set(oppId, daysAgo);
        }
      }
    }

    // ── Build candidate list ─────────────────────────────────────────────
    // Exclude myself. Skip candidates without a rating in this category
    // (they're not on the ladder — suggestions would be meaningless).
    const candidates = profilesQuery.data
      .filter((p) => p.user_id !== myUserId)
      .flatMap((p) => {
        const candidateRating = ratingOf(p.user_id);
        if (candidateRating === null) return []; // unranked in this category — skip
        const availability: string[] = p.availability_windows ?? [];
        const playedDaysAgo = lastPlayedMap.get(p.user_id) ?? null;
        return [
          {
            userId: p.user_id,
            name: `${p.first_name} ${p.last_name}`,
            rating: candidateRating,
            availability,
            playedDaysAgo,
          },
        ];
      });

    // ── Score + rank ─────────────────────────────────────────────────────
    const me = {
      userId: myUserId,
      rating: myRating,
      availability: myAvailability,
      // TODO(msg): wire blocked set once user_blocks ships
      blocked: new Set<string>(),
    };

    const scored = scoreCandidates(me, candidates);

    // Return top 5 mapped to the public shape.
    return scored.slice(0, 5).map((c) => ({
      userId: c.userId,
      name: c.name,
      rating: c.rating,
      score: c.score,
    }));
  }, [
    myUserId,
    category,
    rankingRows,
    historyRows,
    profilesQuery.data,
    ratingOf,
    // ladderRows is intentionally omitted — ratingOf is a stable memo derived
    // from it; including rows would cause unnecessary recomputation.
  ]);

  // Suppress the unused-variable lint on ladderRows (it drives ratingOf via useLadder internals).
  void ladderRows;

  return { suggestions, isLoading };
}
