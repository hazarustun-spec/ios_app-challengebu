// Banner primitive — Plan 8 Phase C7.
//
// Ports the design bundle's `Banner` (see
//   docs/superpowers/specs/plan-8-design-bundle/project/Component Library.html
//   `function Banner({ tone, title, body }) { ... }`
// ) to React Native + NativeWind.
//
// Visual contract:
//   - Inline alert surface (no overlay, no dismiss button) used directly in
//     content streams. Examples: "Skor uyuşmuyor" (error) on the active
//     match screen, "Sezon finali yaklaşıyor" (info) on home, "Skor
//     onaylandı" (success) confirmations, "Skor onayı bekliyor" (warning)
//     on the matches list.
//   - 1.5px ink-tone border in the tone color over a soft tonal fill.
//   - Leading Icon (info/check/warn/xCircle) + title (extrabold, 13.5px,
//     text ink) + optional body line (12.5px, text-2, leading-5).
//
// `inline` shrinks the outer padding from 14px → 12px for in-list usage so
// the banner can sit flush inside a Card body without looking oversized.

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

export interface BannerProps {
  tone: BannerTone;
  title: string;
  body?: string;
  /** Tighter padding for in-list usage (12px vs 14px). Defaults to false. */
  inline?: boolean;
}

interface ToneSpec {
  bgClass: string;
  borderClass: string;
  iconName: IconName;
  iconColor: string;
}

const TONE_MAP: Record<BannerTone, ToneSpec> = {
  info: {
    bgClass: 'bg-blue-soft',
    borderClass: 'border-court',
    iconName: 'info',
    iconColor: colors.court,
  },
  success: {
    bgClass: 'bg-lime-soft',
    borderClass: 'border-win',
    iconName: 'check',
    iconColor: colors.win,
  },
  warning: {
    bgClass: 'bg-warn-soft',
    borderClass: 'border-warn',
    iconName: 'warn',
    iconColor: colors.warn,
  },
  error: {
    // Source-of-truth red-soft is an inline hex; no token exists yet so we
    // mirror the design bundle's `#FCE6E4` arbitrary value here.
    bgClass: 'bg-[#FCE6E4]',
    borderClass: 'border-loss',
    iconName: 'xCircle',
    iconColor: colors.loss,
  },
};

export function Banner({ tone, title, body, inline }: BannerProps) {
  const spec = TONE_MAP[tone];
  const containerClass = [
    'flex-row gap-3 rounded-md border-base',
    spec.bgClass,
    spec.borderClass,
    inline ? 'p-3' : 'p-3.5',
  ].join(' ');

  return (
    <View className={containerClass}>
      <Icon name={spec.iconName} size={20} color={spec.iconColor} stroke={2.3} />
      <View className="flex-1">
        <Text
          className="font-sans text-[13.5px] font-extrabold"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
        {body !== undefined && (
          <Text
            className="mt-0.5 font-sans text-[12.5px] leading-5"
            style={{ color: colors.text2 }}
          >
            {body}
          </Text>
        )}
      </View>
    </View>
  );
}
