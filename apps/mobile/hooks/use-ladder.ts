// hooks/use-ladder.ts — Category ladder + per-player ELO resolver.
//
// One shared source for (a) the leaderboard ranking of a category and
// (b) looking up an arbitrary player's ELO for the score badges shown on
// match cards / opponent rows. Built client-side from two readable sources
// so no backend RPC is needed:
//   - `elo_ratings` (RLS: authenticated SELECT using(true)) → rating per
//     (profile, category)
//   - `public_profiles` view → safe display fields incl. the current user
//
// Rank uses standard competition ranking (1, 2, 2, 4) to match the
// per-user `get_user_rankings` RPC's window function.
//
// Display set: players whose public_profiles row exists AND status is one of
// 'active' | 'frozen_30' | 'hibernating_60'. Rows with 'inactive_90' or
// 'anonymized' are excluded. Rank is computed over ALL elo_ratings rows first
// (including excluded ones), so rank gaps appear where excluded players sit —
// matching the real standing from get_user_rankings.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface LadderRow {
  profileId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  rating: number;
  matchesPlayed: number;
  rank: number;
  status: string;
  availabilityWindows: string[];
}

interface EloRow {
  profile_id: string;
  rating: number;
  matches_played: number;
}
interface NameRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status: string;
  availability_windows: string[] | null;
}

/** Statuses that are visible on the leaderboard (rank gaps occur for others). */
const VISIBLE_STATUSES = new Set(['active', 'frozen_30', 'hibernating_60']);

export function useLadder(category: string | undefined) {
  const query = useQuery<LadderRow[]>({
    queryKey: category
      ? queryKeys.ladder.byCategory(category)
      : queryKeys.ladder.all,
    enabled: !!category,
    queryFn: async () => {
      if (!category) return [];
      const [eloRes, nameRes] = await Promise.all([
        supabase
          .from('elo_ratings')
          .select('profile_id, rating, matches_played')
          .eq('category', category)
          .order('rating', { ascending: false }),
        supabase
          .from('public_profiles')
          .select('user_id, first_name, last_name, avatar_url, status, availability_windows'),
      ]);
      if (eloRes.error) throw eloRes.error;
      if (nameRes.error) throw nameRes.error;

      const nameMap = new Map<string, NameRow>();
      for (const n of (nameRes.data ?? []) as NameRow[]) nameMap.set(n.user_id, n);

      const out: LadderRow[] = [];
      // Competition rank (1224 style) computed over ALL elo_ratings rows ordered
      // by rating desc — same basis as get_user_rankings window function.
      // Rank increments for every row in the full ordered set (including excluded
      // players), so displayed rank reflects true standing even with gaps.
      let rank = 0;
      let seen = 0;
      let prevRating: number | null = null;
      for (const r of (eloRes.data ?? []) as EloRow[]) {
        seen += 1;
        if (r.rating !== prevRating) {
          rank = seen;
          prevRating = r.rating;
        }
        const n = nameMap.get(r.profile_id);
        // Skip players without a public profile or with excluded status.
        if (!n || !VISIBLE_STATUSES.has(n.status)) continue;
        out.push({
          profileId: r.profile_id,
          firstName: n.first_name,
          lastName: n.last_name,
          avatarUrl: n.avatar_url,
          rating: r.rating,
          matchesPlayed: r.matches_played,
          rank,
          status: n.status,
          availabilityWindows: n.availability_windows ?? [],
        });
      }
      return out;
    },
  });

  const rows = query.data ?? [];

  const ratingOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rows) m.set(row.profileId, row.rating);
    return (profileId: string | undefined): number | null =>
      profileId ? m.get(profileId) ?? null : null;
  }, [rows]);

  return {
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    /** ELO for a given player in this category, or null if unranked/unknown. */
    ratingOf,
  };
}

/**
 * All-categories ELO lookup, for lists that mix categories (e.g. the match
 * offers/listings feed or open-call applicants). One query, cached; resolve
 * any player's rating in any category via `ratingOf(profileId, category)`.
 */
export function usePlayerRatings() {
  const query = useQuery<Map<string, number>>({
    queryKey: [...queryKeys.ladder.all, 'all-ratings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elo_ratings')
        .select('profile_id, category, rating');
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of (data ?? []) as {
        profile_id: string;
        category: string;
        rating: number;
      }[]) {
        m.set(`${r.profile_id}:${r.category}`, r.rating);
      }
      return m;
    },
  });

  const map = query.data;
  const ratingOf = useMemo(() => {
    return (
      profileId: string | undefined,
      category: string | undefined,
    ): number | null => {
      if (!profileId || !category || !map) return null;
      return map.get(`${profileId}:${category}`) ?? null;
    };
  }, [map]);

  return { isLoading: query.isLoading, ratingOf };
}
