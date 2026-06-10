// apps/mobile/theme/motion.ts
import { Easing } from 'react-native-reanimated';

/** Animation curves from tokens.css motion table. */
export const curves = {
  popIn:    Easing.bezier(0.2, 0.9, 0.3, 1.1),   // modal + rozet (overshoot)
  slideUp:  Easing.bezier(0.2, 0.8, 0.2, 1),     // bottom sheet, list entries
  ball:     Easing.bezier(0.34, 1.4, 0.5, 1),    // canlı maç top
  outQuint: Easing.bezier(0.22, 1, 0.36, 1),     // generic ease-out
} as const;

export const durations = {
  fast: 180,
  normal: 280,
  slow: 420,
  pulse: 1400,
} as const;

/** Score increment animation: scale .45 → 1.18 → 1 */
export const scorePopFrames = [
  { scale: 0.45, opacity: 0.2 },
  { scale: 1.18, opacity: 1 },
  { scale: 1.0, opacity: 1 },
] as const;

/** Pip fill animation: scale 0 → 1.25 → 1 */
export const pipFillFrames = [
  { scale: 0 },
  { scale: 1.25 },
  { scale: 1.0 },
] as const;
