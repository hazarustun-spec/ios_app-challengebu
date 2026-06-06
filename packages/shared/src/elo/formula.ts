import type { MatchFormat } from '../types/formats.js';
import { getKFactor } from './k-factor.js';
import { getMarginMultiplier } from './margin-multiplier.js';

export const DEFAULT_STARTING_ELO = 1200;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloChangeInput {
  winnerRating: number;
  loserRating: number;
  winnerMatchesPlayed: number;
  loserMatchesPlayed: number;
  format: MatchFormat;
  winnerScore: number;
  loserScore: number;
}

export interface EloChangeOutput {
  winnerChange: number;
  loserChange: number;
  winnerNewRating: number;
  loserNewRating: number;
}

export function calculateEloChange(input: EloChangeInput): EloChangeOutput {
  const expectedWinner = expectedScore(input.winnerRating, input.loserRating);
  const kWinner = getKFactor(input.winnerMatchesPlayed);

  const margin = getMarginMultiplier(input.format, input.winnerScore, input.loserScore);

  const rawChange = kWinner * (1 - expectedWinner) * margin;
  const winnerChange = Math.round(rawChange);
  const loserChange = -winnerChange;

  return {
    winnerChange,
    loserChange,
    winnerNewRating: input.winnerRating + winnerChange,
    loserNewRating: input.loserRating + loserChange,
  };
}
