// NavHeader primitive — Plan 8 Phase C5.
//
// Ports the design bundle's `NavHeader` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function NavHeader(...)`) to React Native + NativeWind.
//
// Configurations:
//
//   - standard: [ back ] [ title (centered) ] [ action ? ]
//   - large:    a 27px display title on its own row, optional subtitle, with
//               the back button + actionIcon arranged on the top row above
//   - close:    `close` flag swaps the back arrow for an x icon (modals)
//   - action:   either a text action (`action` string, e.g., "Kaydet") or an
//               icon action (`actionIcon`, e.g., 'clock')
//
// Visual chrome:
//   The back / actionIcon buttons render as 38×38 surface-2 chips with the
//   ink stroke — matches the source. Text actions are bare clay-colored
//   labels with no chip background.

import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { colors } from '../../theme/colors';

export interface NavHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show a back arrow at left and run this callback when tapped. */
  onBack?: () => void;
  /** When true, swap the back arrow for an x icon (modal close). */
  close?: boolean;
  /** Text label for the trailing action (e.g., "Kaydet", "Sıfırla"). */
  action?: string;
  /** Icon name for the trailing action (e.g., 'clock', 'filter', 'settings'). */
  actionIcon?: IconName;
  onAction?: () => void;
  /** Switch to the large display title layout. */
  large?: boolean;
  /** When provided, the title text becomes a pressable that calls this. */
  onPressTitle?: () => void;
}

export function NavHeader({
  title,
  subtitle,
  onBack,
  close,
  action,
  actionIcon,
  onAction,
  large,
  onPressTitle,
}: NavHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={large ? 'pb-1 px-4.5' : 'pb-1 px-3.5'}
      style={{ paddingTop: insets.top + (large ? 6 : 8) }}
    >
      <View className="flex-row items-center gap-2.5 min-h-[48px]">
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            className="w-9 h-9 rounded-sm bg-surface-2 items-center justify-center"
          >
            <Icon name={close ? 'x' : 'back'} size={20} color={colors.text} />
          </Pressable>
        )}

        {/* Standard title (centered when no back, left-aligned when back present) */}
        {!large && (
          <View
            className={[
              'flex-1',
              onBack ? 'items-start' : 'items-center',
            ].join(' ')}
          >
            {title && onPressTitle ? (
              <Pressable
                onPress={onPressTitle}
                accessibilityRole="button"
                className="active:opacity-70"
              >
                <Text
                  className="font-display font-extrabold text-[16px] text-text"
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </Pressable>
            ) : title ? (
              <Text
                className="font-display font-extrabold text-[16px] text-text"
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null}
            {subtitle && (
              <Text
                className="text-text-3 text-[12px] font-semibold"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {/* Large layout fills the row with the title + subtitle stack */}
        {large && (
          <View className="flex-1">
            {title && (
              <Text className="font-display font-extrabold text-[27px] text-text tracking-[-0.27px]">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text className="text-text-3 text-[13.5px] font-semibold mt-1">
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {/* Trailing action — text label OR icon chip */}
        {action && (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            className="active:opacity-80"
          >
            <Text className="font-sans font-bold text-[15px] text-clay">
              {action}
            </Text>
          </Pressable>
        )}
        {actionIcon && (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            className={
              large
                ? 'w-10 h-10 rounded-sm bg-surface-2 items-center justify-center'
                : 'w-9 h-9 rounded-sm bg-surface-2 items-center justify-center'
            }
          >
            <Icon
              name={actionIcon}
              size={large ? 21 : 20}
              color={colors.text}
            />
          </Pressable>
        )}

        {/* Spacer to balance the row when there's nothing on the right and
            no back button on the left — keeps the centered title centered. */}
        {!onBack && !large && !action && !actionIcon && (
          <View className="w-9 h-9" />
        )}
      </View>
    </View>
  );
}
