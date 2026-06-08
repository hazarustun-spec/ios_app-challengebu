import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getLevel, levelChanged } from '@tennis/shared';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import {
  useCelebrationStore,
  type AwardedBadgeView,
  type CelebrationItem,
} from '../stores/post-match-celebration-store';

interface AwardedPayload {
  userId: string;
  badges: AwardedBadgeView[];
}

export interface ConfirmMatchResponse {
  confirmed: boolean;
  status?: string;
  alreadyConfirmed?: boolean;
  awarded?: AwardedPayload[];
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  const enqueue = useCelebrationStore((s) => s.enqueue);
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<ConfirmMatchResponse>('confirm-match', input, token);
    },
    onSuccess: async (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchHistory.all });
      qc.invalidateQueries({ queryKey: queryKeys.badges.mine() });
      qc.invalidateQueries({ queryKey: queryKeys.rankings.mine() });
      qc.invalidateQueries({ queryKey: queryKeys.eloHistory.all });

      if (!data.confirmed || data.status !== 'confirmed') return;

      const myId = useAuthStore.getState().user?.id;
      if (!myId) return;

      const items: CelebrationItem[] = [];

      const myAward = (data.awarded ?? []).find((a) => a.userId === myId);
      if (myAward) {
        for (const b of myAward.badges) {
          items.push({ kind: 'badge', badge: b });
        }
      }

      const change = await computeLevelChange(variables.matchId, myId);
      if (change) items.push({ kind: 'level', before: change.before, after: change.after });

      if (items.length > 0) enqueue(items);
    },
  });
}

async function computeLevelChange(
  matchId: string,
  userId: string,
): Promise<{ before: ReturnType<typeof getLevel>; after: ReturnType<typeof getLevel> } | null> {
  const { data: match } = await supabase
    .from('matches')
    .select(`
      team_a_player_ids, team_b_player_ids,
      rating_before_team_a, rating_after_team_a,
      rating_before_team_b, rating_after_team_b
    `)
    .eq('id', matchId)
    .maybeSingle();
  if (!match) return null;
  // Singles only: in doubles, rating_*_team_* stores the team average
  // (apply-elo.ts), not the individual rating, so a per-player level-up
  // can't be derived from this row. Plan 8 may revisit doubles via
  // elo_ratings lookups.
  const teamA = match.team_a_player_ids as string[];
  const teamB = match.team_b_player_ids as string[];
  if (teamA.length !== 1 || teamB.length !== 1) return null;
  const onA = teamA.includes(userId);
  const before = onA ? match.rating_before_team_a : match.rating_before_team_b;
  const after = onA ? match.rating_after_team_a : match.rating_after_team_b;
  if (before === null || after === null) return null;
  const change = levelChanged(before, after);
  if (!change.up) return null;
  return { before: change.before, after: change.after };
}
