import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

type WinnerTeam = 'a' | 'b' | 'void';

export interface SubmitMatchScoreInput {
  matchId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: WinnerTeam;
  els?: { el: number; winner: 'a' | 'b' }[];
  sets?: { set: number; a: number; b: number }[];
  games?: { a: number; b: number };
  tiebreakScore?: { a: number; b: number };
  points?: { a: number; b: number };
}

export interface SubmitMatchScoreResponse {
  matched: boolean;
}

export function useSubmitMatchScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitMatchScoreInput) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<SubmitMatchScoreResponse>('submit-match-score', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
    },
  });
}
