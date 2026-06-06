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
  if (!Number.isFinite(input.winnerRating)) {
    throw new Error(`winnerRating must be a finite number, got ${input.winnerRating}`);
  }
  if (!Number.isFinite(input.loserRating)) {
    throw new Error(`loserRating must be a finite number, got ${input.loserRating}`);
  }

  const expectedWinner = expectedScore(input.winnerRating, input.loserRating);

  // We intentionally use the winner's K-factor for both sides, not Math.min(kWinner, kLoser).
  // Math.min would collapse the K=40 new-player calibration whenever they face an established
  // player, defeating its purpose. Using kWinner preserves zero-sum (loserChange = -winnerChange)
  // while letting new winners gain at K=40 and forcing established losers to absorb that K
  // when they lose to a new player. This is a deliberate club-scale fairness trade-off.
  const k = getKFactor(input.winnerMatchesPlayed);
  // Note: input.loserMatchesPlayed is intentionally not used in the K-factor calculation.
  // It is still validated via getKFactor in the original implementation's intent — call it
  // here purely for input validation (will throw on invalid values).
  getKFactor(input.loserMatchesPlayed);

  const margin = getMarginMultiplier(input.format, input.winnerScore, input.loserScore);

  const rawChange = k * (1 - expectedWinner) * margin;
  const winnerChange = Math.round(rawChange);
  const loserChange = -winnerChange;

  return {
    winnerChange,
    loserChange,
    winnerNewRating: input.winnerRating + winnerChange,
    loserNewRating: input.loserRating + loserChange,
  };
}
