// DUPLICATED from packages/shared/src/elo/ to avoid Deno/Node.js extension resolution conflicts.
// packages/shared uses `.js` extensions in its imports (NodeNext convention) but the files only
// exist as `.ts`; Deno cannot resolve those without an unstable flag that the Supabase Edge
// Runtime may not honor. Re-exporting directly is therefore unreliable.
//
// Tests in packages/shared cover the canonical algorithm.
// If logic here diverges from packages/shared, that is a bug.
//
// Sources:
//   packages/shared/src/elo/k-factor.ts
//   packages/shared/src/elo/margin-multiplier.ts
//   packages/shared/src/elo/formula.ts
//   packages/shared/src/types/formats.ts

// ---------------------------------------------------------------------------
// Match formats
// ---------------------------------------------------------------------------

export const ALL_FORMATS = ['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik'] as const;

export type MatchFormat = (typeof ALL_FORMATS)[number];

// ---------------------------------------------------------------------------
// K-factor
// ---------------------------------------------------------------------------

export const K_NEW_PLAYER = 40;
export const K_ESTABLISHED = 20;
export const NEW_PLAYER_THRESHOLD = 10;

export function getKFactor(matchesPlayed: number): number {
  if (!Number.isInteger(matchesPlayed) || matchesPlayed < 0) {
    throw new Error(`matchesPlayed must be a non-negative integer, got ${matchesPlayed}`);
  }
  return matchesPlayed < NEW_PLAYER_THRESHOLD ? K_NEW_PLAYER : K_ESTABLISHED;
}

// ---------------------------------------------------------------------------
// Margin multiplier
// ---------------------------------------------------------------------------

export function getMarginMultiplier(
  format: MatchFormat,
  winnerScore: number,
  loserScore: number,
): number {
  if (!Number.isInteger(winnerScore) || winnerScore < 0) {
    throw new Error(`winnerScore must be a non-negative integer, got ${winnerScore}`);
  }
  if (!Number.isInteger(loserScore) || loserScore < 0) {
    throw new Error(`loserScore must be a non-negative integer, got ${loserScore}`);
  }
  if (loserScore >= winnerScore) {
    throw new Error(`loserScore (${loserScore}) must be less than winnerScore (${winnerScore})`);
  }

  const diff = winnerScore - loserScore;

  switch (format) {
    case 'bu_klasik':
      // 4-0=1.5, 4-1=1.3, 4-2=1.1, 4-3=1.0
      if (diff >= 4) return 1.5;
      if (diff === 3) return 1.3;
      if (diff === 2) return 1.1;
      return 1.0;

    case 'hizli_tiebreak':
      // 10-0=1.5, 10-5=1.2 (diff 5), 10-8=1.0 (diff 2)
      if (diff >= 10) return 1.5;
      if (diff >= 5) return 1.2;
      return 1.0;

    case 'pro_set_8':
      // 8-0=1.5 (diff 8), 8-4=1.2 (diff 4), 9-8=1.0 (diff 1)
      if (diff >= 8) return 1.5;
      if (diff >= 4) return 1.2;
      return 1.0;

    case '3set_klasik':
      // 2-0=1.3, 2-1=1.0
      if (diff >= 2) return 1.3;
      return 1.0;
  }
}

// ---------------------------------------------------------------------------
// Singles ELO change
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Doubles ELO change
// ---------------------------------------------------------------------------

export interface DoublesEloChangeInput {
  winnerTeamRatings: [number, number];
  loserTeamRatings: [number, number];
  winnerTeamMatchesPlayed: [number, number];
  loserTeamMatchesPlayed: [number, number];
  format: MatchFormat;
  winnerScore: number;
  loserScore: number;
}

export interface DoublesEloChangeOutput {
  winnerChanges: [number, number];
  loserChanges: [number, number];
  winnerNewRatings: [number, number];
  loserNewRatings: [number, number];
}

export function calculateDoublesEloChange(input: DoublesEloChangeInput): DoublesEloChangeOutput {
  if (
    input.winnerTeamRatings.length !== 2 ||
    input.loserTeamRatings.length !== 2 ||
    input.winnerTeamMatchesPlayed.length !== 2 ||
    input.loserTeamMatchesPlayed.length !== 2
  ) {
    throw new Error('Doubles teams must have exactly 2 players each');
  }

  const winnerAvg = (input.winnerTeamRatings[0] + input.winnerTeamRatings[1]) / 2;
  const loserAvg = (input.loserTeamRatings[0] + input.loserTeamRatings[1]) / 2;
  const expectedWinner = expectedScore(winnerAvg, loserAvg);

  const allMatchesPlayed = [...input.winnerTeamMatchesPlayed, ...input.loserTeamMatchesPlayed];
  const minMatchesPlayed = Math.min(...allMatchesPlayed);
  const k = getKFactor(minMatchesPlayed);

  const margin = getMarginMultiplier(input.format, input.winnerScore, input.loserScore);

  const rawChange = k * (1 - expectedWinner) * margin;

  // Distribute equally across both players. Per-player rounding preserves zero-sum
  // (2 * perPlayer for winners, -2 * perPlayer for losers) and ensures both teammates
  // receive identical changes — important for fairness in doubles.
  const perPlayer = Math.round(rawChange / 2);
  const winnerChanges: [number, number] = [perPlayer, perPlayer];
  const loserChanges: [number, number] = [-perPlayer, -perPlayer];

  return {
    winnerChanges,
    loserChanges,
    winnerNewRatings: [
      input.winnerTeamRatings[0] + winnerChanges[0],
      input.winnerTeamRatings[1] + winnerChanges[1],
    ],
    loserNewRatings: [
      input.loserTeamRatings[0] + loserChanges[0],
      input.loserTeamRatings[1] + loserChanges[1],
    ],
  };
}
