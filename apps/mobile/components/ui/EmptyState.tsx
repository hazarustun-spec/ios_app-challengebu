// EmptyState primitive — Plan 8 Phase C (final batch).
//
// Ports the design bundle's `EmptyState` block (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function EmptyState(...)`) to React Native.
//
// Visual contract:
//   - Vertically centered column: 72×72 circular icon chip, display
//     extrabold title (21px), optional body line (text-2 14px), optional
//     action Button, and an optional `extra` slot for tiny footers
//     (e.g., technical error code / correlation id).
//   - Two tones: `info` (surface-2 chip with ink glyph) and `error`
//     (soft pink chip with loss-red glyph). Both keep the title + body
//     in the same ink tones so the affordance is the icon, not the text.
//
// Used by every list/page that can be empty (matches list, leaderboard,
// notifications, profile history) and by the global error boundary's
// "Bir şeyler ters gitti" surface.

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type EmptyStateTone = 'info' | 'error';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  /** Primary action button label. Pairs with `onAction`. */
  action?: string;
  onAction?: () => void;
  /** Visual tone. Defaults to `info`. */
  tone?: EmptyStateTone;
  /** Tiny footer node (e.g., `<Text>TOKEN_EXPIRED · 401</Text>`). */
  extra?: ReactNode;
}

interface ToneSpec {
  iconBg: string;
  iconColor: string;
}

const TONE_MAP: Record<EmptyStateTone, ToneSpec> = {
  info: { iconBg: colors.surface2, iconColor: colors.text },
  error: { iconBg: '#FCE6E4', iconColor: colors.loss },
};

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
  tone = 'info',
  extra,
}: EmptyStateProps) {
  const map = TONE_MAP[tone];
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ paddingHorizontal: 32, paddingVertical: 40, gap: 16 }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: map.iconBg,
        }}
      >
        <Icon name={icon} size={32} color={map.iconColor} />
      </View>
      <Text
        className="font-display font-extrabold"
        style={{
          fontSize: 21,
          color: colors.text,
          textAlign: 'center',
          letterSpacing: -0.42,
        }}
      >
        {title}
      </Text>
      {body && (
        <Text
          className="font-sans"
          style={{
            fontSize: 14,
            color: colors.text2,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {body}
        </Text>
      )}
      {action && onAction && (
        <View style={{ marginTop: 8 }}>
          <Button onPress={onAction} variant="primary">
            {action}
          </Button>
        </View>
      )}
      {extra && <View style={{ marginTop: 8 }}>{extra}</View>}
    </View>
  );
}
