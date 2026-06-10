// Card primitive — Plan 8 Phase C5.
//
// Ports the design bundle's `Card` styling pattern (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Card(...)`) to React Native + NativeWind.
//
// The source ships a single rounded surface with a 1.5px ink border. We
// expose three semantic variants the screens use day-to-day:
//
//   - default     — plain content surface (matches the source verbatim)
//   - interactive — same surface, but rendered as a Pressable with an
//                   `active:opacity-80` press affordance
//   - featured    — court-blue hero surface (matches the ELO HERO card on
//                   the home screen)
//
// Token rationale: the Plan 8 design system ships `shadow: none` across the
// board, so we do not layer in any shadow even for the featured variant —
// depth is communicated entirely via the inked border + saturated fill.

import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

export type CardVariant = 'default' | 'interactive' | 'featured';

export interface CardProps {
  variant?: CardVariant;
  /**
   * When supplied, the card renders as a Pressable. Implicitly upgrades a
   * `default` variant to interactive press feedback so callers don't need
   * to remember both props.
   */
  onPress?: () => void;
  children?: ReactNode;
  /** Pass-through for sizing / padding overrides at the call site. */
  className?: string;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-surface border-base border-border-strong',
  interactive: 'bg-surface border-base border-border-strong active:opacity-80',
  featured: 'bg-court border-base border-border-strong',
};

export function Card({
  variant = 'default',
  onPress,
  children,
  className,
}: CardProps) {
  const baseClass = [
    'rounded-lg p-4',
    VARIANT_CLASSES[variant],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onPress || variant === 'interactive') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        className={baseClass}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={baseClass}>{children}</View>;
}
