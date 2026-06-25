import { Platform } from 'react-native';
import Native, { type LiveMatchSubscription } from '../modules/live-match-activity';
import { invokeFunction } from './invoke-function';

export type LiveMatchAttrs = {
  matchId: string;
  youSide: 'a' | 'b';
  nameA: string;
  nameB: string;
  categoryLabel?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  accessToken?: string;
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
  if (Platform.OS !== 'ios' || !Native) return false;
  try {
    return Native.isSupported();
  } catch {
    return false;
  }
}

export async function startMatchActivity(a: LiveMatchAttrs): Promise<void> {
  if (!Native || !isSupported()) return;
  try {
    await Native.start(a);
  } catch {
    // A Live Activity failure must never break the scoring flow.
  }
}

export async function updateMatchActivity(s: LiveMatchState): Promise<void> {
  if (!Native) return;
  try {
    await Native.update(s);
  } catch {
    // never break scoring
  }
}

export async function endMatchActivity(s: LiveMatchState): Promise<void> {
  if (!Native) return;
  try {
    await Native.end(s);
  } catch {
    // never break scoring
  }
}

// Subscribe to the activity's APNs push token and register it with the backend
// so the server can push score updates to the Live Activity (cross-device sync).
// Returns an EventSubscription whose `.remove()` should be called on cleanup, or
// null when the native module isn't available. A registration failure must never
// break the scoring flow.
export function registerActivityPushToken(
  matchId: string,
  accessToken: string,
): LiveMatchSubscription | null {
  if (!Native || Platform.OS !== 'ios') return null;
  try {
    return Native.addListener('onPushToken', ({ token }) => {
      invokeFunction('register-activity-token', { matchId, token }, accessToken).catch(() => {
        // never break scoring
      });
    });
  } catch {
    // never break scoring
    return null;
  }
}
