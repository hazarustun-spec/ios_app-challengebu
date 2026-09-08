// Segmented control primitive — Plan 8 Phase C4.
//
// Ports the design bundle's `Segmented` component (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Segmented(...)`) to React Native + NativeWind.
//
// Visual:
//   - surface-2 background container, rounded-md
//   - each option = flex-1 button
//   - selected = surface background + 1.5px ink border + text (ink)
//   - unselected = transparent + text-2
//   - an option with `badge: true` also gets a 7px red (loss) dot after its
//     label — used by the Maçlar hub to flag pending offers / open calls.
//
// Sizes (per design bundle):
//   - sm → 38px height + 13px font
//   - md → 44px height + 14px font (default)
//
// Consumers: profile tabs, sezon filter, ELO history range,
// profile edit zamir/level selectors.

import { Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export type SegmentedSize = 'sm' | 'md';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /**
   * When true, a small red dot is drawn after the label — "there is something
   * new behind this segment". Purely decorative: it carries no press
   * behaviour, and an undefined/false value renders nothing at all so existing
   * consumers are byte-identical.
   *
   * Same semantic red as a lost match (`colors.loss`), the app's one "needs
   * you" colour. It sits superscript to the label rather than pinned to the
   * segment corner: a corner pip would collide with the 1.5px ink border the
   * selected segment draws, and this one reads on both the selected (surface)
   * and unselected (surface-2) background without a ring.
   */
  badge?: boolean;
}

export interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedOption<T>[];
  size?: SegmentedSize;
}

const HEIGHT_CLASS: Record<SegmentedSize, string> = {
  sm: 'h-[38px]',
  md: 'h-11',
};

const FONT_SIZE_CLASS: Record<SegmentedSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[14px]',
};

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <View className={['flex-row rounded-md bg-surface-2 p-[3px]', HEIGHT_CLASS[size]].join(' ')}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={[
              'mx-[1px] flex-1 flex-row items-center justify-center rounded-sm',
              selected
                ? 'border-base border-border-strong bg-surface'
                : 'border-base border-transparent bg-transparent',
            ].join(' ')}
          >
            <Text
              className={[
                'font-sans font-bold',
                FONT_SIZE_CLASS[size],
                selected ? 'text-text' : 'text-text-2',
              ].join(' ')}
            >
              {o.label}
            </Text>
            {o.badge ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  marginLeft: 5,
                  marginTop: -6,
                  backgroundColor: colors.loss,
                }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
