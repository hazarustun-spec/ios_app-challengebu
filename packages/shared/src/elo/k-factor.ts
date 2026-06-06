export const K_NEW_PLAYER = 40;
export const K_ESTABLISHED = 20;
export const NEW_PLAYER_THRESHOLD = 10;

export function getKFactor(matchesPlayed: number): number {
  if (!Number.isInteger(matchesPlayed) || matchesPlayed < 0) {
    throw new Error(`matchesPlayed must be a non-negative integer, got ${matchesPlayed}`);
  }
  return matchesPlayed < NEW_PLAYER_THRESHOLD ? K_NEW_PLAYER : K_ESTABLISHED;
}
