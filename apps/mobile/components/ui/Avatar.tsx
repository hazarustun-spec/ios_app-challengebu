// Avatar primitive — Plan 8 Phase C8.
//
// Ports the design bundle's `Avatar` + `AvatarBadge` pair (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Avatar(...)`, `function AvatarBadge(...)`) to React Native.
//
// Surface contract:
//   - Circular avatar with deterministic colored initials when no photo URI
//     is supplied. The hash → palette mapping mirrors the design source's
//     `avatarFor()` helper so the same name lands on the same swatch every
//     time the app boots.
//   - Optional `ring` color renders a 3px ring around the inner avatar
//     (used by leaderboard "you-are-here" and live-match indicators).
//   - Optional `badge` corner pip — three variants:
//       • number  → solid pink-deep circle with the integer (e.g., medal #1)
//       • 'frozen' → frozen blue with a snow icon (skipped-week state)
//       • 'level'  → custom colored circle with a `level.icon` glyph
//
// Sizes the screens consume today:
//   24px — chip / inline; 36px — list rows; 44px — default;
//   52px — match cards; 72-92px — profile hero.
//
// Implementation notes:
//   - We render initials via a `<Text>` (not the Image) so missing photos
//     never produce broken-image affordances. Photo URIs always win when
//     provided.
//   - Badge positioning is anchored to the OUTER (ring + avatar) bounding
//     box via absolute `right`/`top` offsets — matches the source's
//     `right: -2, bottom: -2` placement.

import { Image, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

export type AvatarBadge =
  | number
  | 'frozen'
  | { kind: 'level'; color: string; icon: IconName };

export interface AvatarProps {
  /** Display name — used for initials + deterministic palette hash. */
  name: string;
  /** Pixel diameter. Default 44. */
  size?: number;
  /** Photo URL (wins over initials when provided). */
  uri?: string;
  /** Optional ring color around the avatar (rendered as a 3px outer ring). */
  ring?: string;
  /** Optional corner badge — number, 'frozen', or a level descriptor object. */
  badge?: AvatarBadge;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  const out = (first + last).toUpperCase();
  return out.slice(0, 2) || '?';
}

// Deterministic palette — same input always lands on the same swatch.
// Palette colors picked from the design bundle's `avatarFor()` helper to
// stay visually on-brand (soft pastel bg with saturated text).
const PALETTES: Array<{ bg: string; fg: string }> = [
  { bg: '#DDE3F2', fg: colors.acNavy },
  { bg: '#E2EDD2', fg: '#3E5C26' },
  { bg: '#D6E0F4', fg: '#27408A' },
  { bg: '#E9F1DC', fg: colors.acDgreen },
  { bg: '#DBE2F0', fg: '#2E3E8C' },
  { bg: '#E4ECCF', fg: '#4E6B2C' },
];

function paletteFor(name: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette = PALETTES[h % PALETTES.length];
  // The non-null assertion is safe: the array is non-empty and `h % length`
  // always lands inside bounds. We narrow for TypeScript with a fallback.
  return palette ?? { bg: '#DDE3F2', fg: colors.acNavy };
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function Avatar({ name, size = 44, uri, ring, badge }: AvatarProps) {
  const initials = initialsFor(name);
  const { bg, fg } = paletteFor(name);
  const ringWidth = ring ? 3 : 0;
  const innerSize = size - ringWidth * 2;
  // Font size tuned to match the design source (~0.38 of inner diameter).
  const fontSize = Math.round(innerSize * 0.38);

  // Badge geometry — anchored to the outer box (right: -2, top: -2). Diameter
  // scales with avatar size but never drops below 18px (touch-target floor).
  const badgeDiameter = Math.max(18, Math.round(size * 0.35));
  const badgeRadius = Math.max(9, Math.round(size * 0.18));

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ring,
          padding: ringWidth,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            }}
          />
        ) : (
          <View
            style={{
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: fg,
                fontFamily: 'PlusJakartaSans-ExtraBold',
                fontSize,
                fontWeight: '800',
                // Without an explicit lineHeight the line box inherits the
                // font's own ascent/descent, which are not symmetric — flex
                // centring then centres that box, not the glyphs, and the
                // initials sit visibly high in the circle. Initials are always
                // uppercase with no descenders, so a line box equal to the
                // font size is safe and makes the two centres coincide.
                lineHeight: fontSize,
                textAlign: 'center',
                // Android adds its own padding around the line box.
                includeFontPadding: false,
              }}
            >
              {initials}
            </Text>
          </View>
        )}
      </View>
      {badge !== undefined && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            top: -2,
            minWidth: badgeDiameter,
            height: badgeDiameter,
            paddingHorizontal: 4,
            borderRadius: badgeRadius,
            backgroundColor:
              badge === 'frozen'
                ? colors.frozen
                : typeof badge === 'object'
                  ? badge.color
                  : colors.pinkDeep,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {typeof badge === 'number' ? (
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>
              {badge}
            </Text>
          ) : badge === 'frozen' ? (
            <Icon name="snow" size={10} color="#FFFFFF" stroke={2.4} />
          ) : (
            <Icon name={badge.icon} size={10} color="#FFFFFF" stroke={2.4} />
          )}
        </View>
      )}
    </View>
  );
}
