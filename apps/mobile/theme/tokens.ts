// apps/mobile/theme/tokens.ts
import { colors } from './colors';
import { fontFamily, typography } from './typography';
import { curves, durations } from './motion';

export const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40,
} as const;

export const radius = {
  xs: 10, sm: 14, md: 18, lg: 26, xl: 34, pill: 9999,
} as const;

export const borderWidth = {
  thin: 1,
  base: 1.5,          // tüm ink border standardı
  thick: 2,
  emphasis: 5,        // share card outer
  emphasisMax: 10,    // share card medallion
} as const;

export const tokens = {
  colors,
  fontFamily,
  typography,
  spacing,
  radius,
  borderWidth,
  motion: { curves, durations },
} as const;

export type Tokens = typeof tokens;

// Re-export for convenience
export { colors } from './colors';
export { fontFamily, typography } from './typography';
export { curves, durations } from './motion';
export type { ColorToken } from './colors';
export type { TypographyVariant } from './typography';
