// apps/mobile/lib/fonts.ts
// Plan 8 Phase B3: 3 Google Fonts loaded at app boot.
// Token names match apps/mobile/theme/typography.ts fontFamily.

import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

/**
 * Map keys MUST match `fontFamily` values exported from theme/typography.ts
 * so NativeWind `font-display` / `font-sans` / `font-num` classes resolve
 * to the correct loaded face.
 *
 * PlusJakartaSans is loaded as multiple weight variants because body copy
 * needs 400/500/600/700/800 across components. The base "PlusJakartaSans"
 * key maps to the 500-weight (regular body) so unweighted className="font-sans"
 * gets a sensible default.
 *
 * SpaceGrotesk_800Bold does not exist in @expo-google-fonts/space-grotesk
 * (verified against installed v0.4.1 — max weight shipped is 700Bold). The
 * typography token spec uses the "ExtraBold" name as a directive; the
 * actual visual heaviness for numeric strings is achieved via the
 * letterSpacing + fontWeight tweaks in theme/typography.ts.
 */
export const FONTS_MAP = {
  // Display — Bricolage Grotesque 800
  'BricolageGrotesque-ExtraBold': BricolageGrotesque_800ExtraBold,

  // Sans — Plus Jakarta Sans (5 weights)
  'PlusJakartaSans': PlusJakartaSans_500Medium,
  'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
  'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
  'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,

  // Num — Space Grotesk 700 (the 800 isn't shipped by @expo-google-fonts;
  // 700 + the letterSpacing tweak in typography.ts achieves the same visual weight)
  'SpaceGrotesk-ExtraBold': SpaceGrotesk_700Bold,
} as const;

export type FontKey = keyof typeof FONTS_MAP;
