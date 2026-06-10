// BellWithBadge primitive — Plan 8 Phase C (final batch).
//
// Ports the bell + unread-count pip used in the home screen header (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// "BellWithBadge" inside the home greeting block) to React Native.
//
// Visual contract:
//   - Bell icon, default 24px, ink stroke. `color` and `size` override.
//   - When `count > 0`: a 17×17 pinkDeep pill anchored to the bell's
//     top-right corner, with a 1.5px white border so it pops over any
//     background. Shows the count, or "99+" when count > 99.
//
// Consumed by GreetHeader, but exported standalone so other surfaces
// (e.g., a future inbox tab indicator) can reuse the visual.

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Icon } from './Icon';

export interface BellWithBadgeProps {
  count?: number;
  /** Bell glyph diameter. Default 24. */
  size?: number;
  /** Bell stroke color. Default `colors.text` (ink). */
  color?: string;
}

export function BellWithBadge({
  count = 0,
  size = 24,
  color = colors.text,
}: BellWithBadgeProps) {
  return (
    <View>
      <Icon name="bell" size={size} color={color} />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -6,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 8.5,
            backgroundColor: colors.pinkDeep,
            borderWidth: 1.5,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 10, color: '#FFFFFF' }}
          >
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}
