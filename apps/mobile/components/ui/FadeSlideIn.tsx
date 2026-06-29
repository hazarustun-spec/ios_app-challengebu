// FadeSlideIn — a thin wrapper for premium list/section entrance animations.
//
// Wrap a card/row and pass its `index` to get a staggered fade-up as the list
// appears. Built on reanimated's layout entering animations (cheap, runs on the
// UI thread). Keep stagger small so long lists don't feel slow.
//
//   {items.map((it, i) => (
//     <FadeSlideIn key={it.id} index={i}><Card .../></FadeSlideIn>
//   ))}

import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  /** Position in a list — drives the stagger delay. Default 0. */
  index?: number;
  /** Per-item stagger in ms. Default 55. */
  stagger?: number;
  /** Base delay before the first item, ms. Default 0. */
  delay?: number;
  /** Entrance duration, ms. Default 380. */
  duration?: number;
}

export function FadeSlideIn({
  children,
  index = 0,
  stagger = 55,
  delay = 0,
  duration = 380,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(duration)
        .delay(delay + index * stagger)
        // A gentle spring gives the arrival a livelier, more crafted feel
        // (vs a flat linear fade) while staying calm enough for long lists.
        .springify()
        .damping(17)
        .stiffness(130)}
    >
      {children}
    </Animated.View>
  );
}
