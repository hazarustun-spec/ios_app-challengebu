// apps/mobile/theme/typography.ts

export const fontFamily = {
  display: 'BricolageGrotesque-ExtraBold',
  sans: 'PlusJakartaSans',
  num: 'SpaceGrotesk-ExtraBold',
} as const;

/**
 * Type scale — design tokens from styles/tokens.css.
 * Numbers in lineHeight are pixels; design used unitless ratios (e.g. .95 = 95% of size).
 * We convert ratio × size → px for RN compatibility (RN doesn't accept unitless).
 */
export const typography = {
  display:  { fontFamily: fontFamily.display, fontSize: 46,   lineHeight: 44,    letterSpacing: -1.38, fontWeight: '800' as const },
  h1:       { fontFamily: fontFamily.display, fontSize: 27,   lineHeight: 28,    letterSpacing: -0.54, fontWeight: '800' as const },
  h2:       { fontFamily: fontFamily.display, fontSize: 21,   lineHeight: 23,    letterSpacing: -0.42, fontWeight: '800' as const },
  h3:       { fontFamily: fontFamily.sans,    fontSize: 18,   lineHeight: 22,    letterSpacing: -0.18, fontWeight: '800' as const },
  bodyLg:   { fontFamily: fontFamily.sans,    fontSize: 15.5, lineHeight: 22,    fontWeight: '700' as const },
  body:     { fontFamily: fontFamily.sans,    fontSize: 14,   lineHeight: 21,    fontWeight: '500' as const },
  caption:  { fontFamily: fontFamily.sans,    fontSize: 12.5, lineHeight: 18,    fontWeight: '600' as const },
  label:    { fontFamily: fontFamily.sans,    fontSize: 11,   letterSpacing: 1.1, fontWeight: '800' as const },
  num:      { fontFamily: fontFamily.num, letterSpacing: -0.28, fontWeight: '800' as const },
} as const;

export type TypographyVariant = keyof typeof typography;
