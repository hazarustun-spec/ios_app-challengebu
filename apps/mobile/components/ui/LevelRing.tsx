// LevelRing primitive — Plan 8 Phase C (final batch).
//
// Thin wrapper around `Avatar` that paints the level-colored ring derived
// from the player's ELO. Used on the profile hero, leaderboard hero
// cards, and anywhere a level-tinted avatar is needed without manually
// computing the level palette.
//
// The actual ring rendering lives in Avatar; this component is a
// convenience that pulls the right color out of `levelForElo`.

import { levelForElo } from '../../lib/levels';
import { Avatar } from './Avatar';

export interface LevelRingProps {
  /** Display name forwarded to Avatar. */
  name: string;
  /** Current ELO — drives the ring color via `levelForElo`. */
  elo: number;
  /** Pixel diameter. Default 82 (profile hero size). */
  size?: number;
  /** Optional photo URI forwarded to Avatar. */
  uri?: string;
}

export function LevelRing({ name, elo, size = 82, uri }: LevelRingProps) {
  const lv = levelForElo(elo);
  return <Avatar name={name} size={size} uri={uri} ring={lv.color} />;
}
