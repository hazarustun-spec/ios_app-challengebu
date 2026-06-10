// LevelIcon — Plan 8 Phase C9.
//
// Tiny colored glyph for the player's level (`spark` for Çekirge,
// `crown` for Usta/Elit, `trophy` for Şampiyon, etc.). Pure wrapper around
// the shared `Icon` primitive — exists so screens always pull `level.color`
// + `level.icon` from the same `LEVELS` table in `lib/levels.ts` instead of
// hand-wiring per call site.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/icons.jsx
// `function LevelIcon({ level, size }) { ... }` — the design uses one
// stroke=1.6 SVG glyph per level mark; we mirror that with stroke=2.2 so the
// icons stay readable at 12-18px in dense leaderboard rows.

import type { LevelDef } from '../../lib/levels';
import { Icon } from './Icon';

export interface LevelIconProps {
  level: LevelDef;
  /** Pixel size — defaults to 16 (the in-row size used by leaderboards). */
  size?: number;
}

export function LevelIcon({ level, size = 16 }: LevelIconProps) {
  return <Icon name={level.icon} size={size} color={level.color} stroke={2.2} />;
}
