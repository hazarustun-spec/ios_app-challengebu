export type FinalePlacement = 'champion' | 'finalist' | 'semifinalist' | 'qf';

export const FINALE_POINTS: Record<FinalePlacement, number> = {
  champion: 100,
  finalist: 70,
  semifinalist: 50,
  qf: 25,
};

export function getFinalePoints(placement: FinalePlacement): number {
  return FINALE_POINTS[placement];
}

export function placementFromRank(rank: number): FinalePlacement | null {
  if (rank === 1) return 'champion';
  if (rank === 2) return 'finalist';
  if (rank === 3 || rank === 4) return 'semifinalist';
  if (rank >= 5 && rank <= 8) return 'qf';
  return null;
}
