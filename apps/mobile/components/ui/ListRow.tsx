// ListRow primitive — Plan 8 Phase C5.
//
// Ports the design bundle's `ListRow` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function ListRow(...)`) to React Native + NativeWind.
//
// Layout (left → right):
//   [ icon chip (surface-2) ]  [ title / subtitle stack ]  [ right slot ]  [ chevR ]
//
// `right` is an arbitrary node so callers can drop a Toggle, badge, plain
// Text, etc. without us having to model every combination. `chevron` is a
// boolean shorthand for the most common right affordance — the chevR icon
// trailing a tappable row.
//
// `danger` flips the title + icon to the loss red. Used by destructive rows
// like "Hesabı sil" in Settings.

import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../../theme/colors';

export interface ListRowProps {
  icon?: IconName;
  /** Override the icon stroke color (otherwise text-2, or loss when danger). */
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** Show the trailing chevR icon (text-3). */
  chevron?: boolean;
  /** Arbitrary right-side content (badge, Toggle, plain text…). */
  right?: ReactNode;
  onPress?: () => void;
  /** Red title + icon (e.g., "Hesabı sil"). */
  danger?: boolean;
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  chevron,
  right,
  onPress,
  danger,
}: ListRowProps) {
  const defaultIconColor = danger ? colors.loss : colors.text2;
  const resolvedIconColor = iconColor ?? defaultIconColor;

  const titleClass = [
    'font-sans font-bold text-[15px]',
    danger ? 'text-loss' : 'text-text',
  ].join(' ');

  const content = (
    <View className="flex-row items-center gap-3 py-3.5 px-4">
      {icon && (
        <View className="w-9 h-9 rounded-sm bg-surface-2 items-center justify-center">
          <Icon name={icon} size={19} color={resolvedIconColor} />
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text className={titleClass} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-text-3 text-[12.5px] font-semibold mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {chevron && <Icon name="chevR" size={18} color={colors.text3} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="active:opacity-80"
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
