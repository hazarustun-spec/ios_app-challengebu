import type { MatchFormat } from '../types/formats.js';

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
