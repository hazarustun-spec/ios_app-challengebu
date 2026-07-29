// GreetHeader primitive — Plan 8 Phase C (final batch).
//
// Ports the home-screen top greeting block (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function GreetHeader(...)`) to React Native.
//
// Layout:
//   - Two-line greeting on the left ("Selam," small ink-3 caption + the
//     user's name in display extrabold), with an optional sub line
//     beneath in text-2 semibold.
//   - 44×44 bell tap target on the right, rendering the BellWithBadge
//     pip when `unreadCount > 0`.
//
// Negative `marginRight: -8` on the bell wrapper aligns the bell glyph
// to the same optical edge as other 18px-padded headers in the design
// bundle.

import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { BellWithBadge } from './BellWithBadge';

export interface GreetHeaderProps {
  /** Display name shown beneath "Selam,". */
  name: string;
  /** Optional sub line (e.g., "Bugün maç günü mü?"). */
  sub?: string;
  /** Notification count for the bell pip. Defaults to 0 (no pip). */
  unreadCount?: number;
  /** Bell tap handler. */
  onBellPress?: () => void;
  /** Extra element rendered immediately to the left of the bell. */
  leftOfBell?: ReactNode;
}

export function GreetHeader({
  name,
  sub,
  unreadCount = 0,
  onBellPress,
  leftOfBell,
}: GreetHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 14,
        paddingBottom: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          className="font-sans"
          style={{ fontSize: 13, color: colors.text3 }}
        >
          Selam,
        </Text>
        <Text
          className="font-display font-extrabold"
          style={{
            fontSize: 24,
            color: colors.text,
            lineHeight: 28,
            letterSpacing: -0.5,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {sub && (
          <Text
            className="font-sans font-semibold"
            style={{ fontSize: 13, color: colors.text2, marginTop: 3 }}
            numberOfLines={1}
          >
            {sub}
          </Text>
        )}
      </View>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {leftOfBell}
        <Pressable
          onPress={onBellPress}
          className="items-center justify-center"
          style={{ width: 44, height: 44, marginRight: -8 }}
          accessibilityRole="button"
          accessibilityLabel="Bildirimler"
        >
          <BellWithBadge count={unreadCount} />
        </Pressable>
      </View>
    </View>
  );
}
