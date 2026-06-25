import { Platform } from 'react-native';
import Native from '../modules/live-match-activity';

export type LiveMatchAttrs = {
  matchId: string;
  youSide: 'a' | 'b';
  nameA: string;
  nameB: string;
  categoryLabel?: string;
};

export type LiveMatchState = {
  gamesA: number;
  gamesB: number;
  pointsA: number;
  pointsB: number;
  phase: 'ongoing' | 'void' | 'finished';
  winner?: 'a' | 'b' | null;
};

export function isSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return Native.isSupported();
  } catch {
    return false;
  }
}

export async function startMatchActivity(a: LiveMatchAttrs): Promise<void> {
  if (!isSupported()) return;
  try {
    await Native.start(a);
  } catch {
    // A Live Activity failure must never break the scoring flow.
  }
}

export async function updateMatchActivity(s: LiveMatchState): Promise<void> {
  try {
    await Native.update(s);
  } catch {
    // never break scoring
  }
}

export async function endMatchActivity(s: LiveMatchState): Promise<void> {
  try {
    await Native.end(s);
  } catch {
    // never break scoring
  }
}
