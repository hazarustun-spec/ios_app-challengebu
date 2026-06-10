// Toggle (switch) primitive — Plan 8 Phase C4.
//
// Ports the design bundle's `Toggle` component (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Toggle(...)`) to React Native + NativeWind +
// react-native-reanimated.
//
// Visual (matches design source pixel-for-pixel):
//   - track: 50×30, rounded-pill, surface-3 (off) / win/grass (on)
//   - thumb: 24×24, rounded-full, white, top:3, left:3 ↔ left:23
//
// Touch target — the visible track is 50×30 (30pt tall); we add a 7pt
// vertical hit slop so the active tap region meets Apple HIG's 44pt
// minimum without changing the rendered geometry.
//
// Consumers: notification preferences (8 categories), settings push
// toggle, profile edit "Göster" flags, admin announcement publish flag.

import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

export interface ToggleProps {
  value: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

const THUMB_OFF = 3;
const THUMB_ON = 23;

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  // useDerivedValue recomputes whenever `value` changes on the JS thread and
  // pipes the result through withTiming on the UI thread — no useEffect /
  // explicit re-target needed, which keeps the component snapshot-testable
  // without faking React's hook dispatcher.
  const left = useDerivedValue(
    () => withTiming(value ? THUMB_ON : THUMB_OFF, { duration: 180 }),
    [value],
  );

  const thumbStyle = useAnimatedStyle(() => ({ left: left.value }));

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!value)}
      disabled={disabled}
      hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      className={[
        'relative h-[30px] w-[50px] flex-shrink-0 rounded-pill',
        value ? 'bg-win' : 'bg-surface-3',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <Animated.View
        style={[{ top: 3, width: 24, height: 24 }, thumbStyle]}
        className="absolute rounded-full"
      >
        <View className="h-full w-full rounded-full bg-white" />
      </Animated.View>
    </Pressable>
  );
}
