// PickList — single-select option list used by onboarding wizard steps
// (pronoun, category, level, hand). Ports the design bundle's `PickList`
// (screens-onboarding.jsx lines 51-74).
//
// Each row: optional 38px leading icon tile, label + optional desc, and a
// 22px trailing radio dot. Selected row uses clay border + clay-softer fill;
// the leading tile shifts to clay-soft / clay accent.

import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '../ui/Icon';
import { colors } from '../../theme/colors';
import { haptics } from '../../lib/haptics';

export interface PickOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  desc?: string;
}

export interface PickListProps<T extends string> {
  /** Currently selected value. Pass `null` to show no pre-selected option. */
  value: T | null;
  onPick: (v: T) => void;
  options: PickOption<T>[];
  /** Render as a multi-column grid. Default 1 (full-width rows). */
  cols?: number;
}

export function PickList<T extends string>({
  value,
  onPick,
  options,
  cols = 1,
}: PickListProps<T>) {
  return (
    <View
      style={{
        flexDirection: cols > 1 ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: 10,
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptics.select();
              onPick(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 15,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: on ? colors.clay : colors.borderStrong,
              backgroundColor: on ? colors.claySofter : colors.surface,
              width: cols > 1 ? `${100 / cols - 2}%` : '100%',
            }}
          >
            {o.icon && (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: on ? colors.claySoft : colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={o.icon}
                  size={20}
                  color={on ? colors.clay : colors.text2}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 15.5 }}
              >
                {o.label}
              </Text>
              {o.desc && (
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 13, marginTop: 2, lineHeight: 18 }}
                >
                  {o.desc}
                </Text>
              )}
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: on ? 0 : 2,
                borderColor: colors.borderStrong,
                backgroundColor: on ? colors.clay : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on && <Icon name="check" size={14} color="#FFFFFF" stroke={3} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
