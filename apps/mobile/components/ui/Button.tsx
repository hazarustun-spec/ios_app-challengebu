// Button primitive — Plan 8 Phase C1.
//
// Ports the design bundle's Button (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Button(...)`) to React Native + NativeWind.
//
// Variants (6): primary, secondary, danger, dark, ghost, tonal
// Sizes   (3): sm, md, lg (default md)
//
// Tokens (bg-lime, border-strong, on-lime, ...) are declared in
// apps/mobile/tailwind.config.js. NativeWind 4 resolves the className
// strings at compile time; we DO NOT fall back to inline styles.
//
// The `arrow` / `icon` / `iconRight` props accept ReactNode placeholders.
// The full Icon component arrives in Phase C8; until then `arrow` renders
// a simple chevron glyph so screens that opt in still get the affordance,
// and `icon` / `iconRight` are forwarded as-is so callers can supply their
// own rendered nodes once the Icon component lands.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dark' | 'ghost' | 'tonal';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  arrow?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  /** Light tap haptic on press. Default true; set false for low-stakes buttons. */
  haptic?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-lime border-base border-border-strong',
  secondary: 'bg-surface border-base border-border-strong',
  danger: 'bg-loss border-base border-border-strong',
  dark: 'bg-clay border-base border-border-strong',
  ghost: 'bg-transparent border-0',
  tonal: 'bg-surface-2 border-0',
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: 'text-on-lime',
  secondary: 'text-text',
  danger: 'text-white',
  dark: 'text-white',
  ghost: 'text-text',
  tonal: 'text-text-2',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-pill',
  md: 'h-11 px-4 rounded-pill',
  lg: 'h-14 px-5 rounded-pill',
};

const SIZE_TEXT_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[14.5px]',
  lg: 'text-[15.5px]',
};

// Spinner color must be a literal hex — RN's ActivityIndicator does not
// resolve Tailwind classes. Sourced from theme/colors.ts.
const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: '#161618', // on-lime / ink
  secondary: '#161618',
  danger: '#FFFFFF',
  dark: '#FFFFFF',
  ghost: '#161618',
  tonal: '#65656E', // text-2
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  arrow,
  icon,
  iconRight,
  loading,
  disabled,
  onPress,
  children,
  haptic = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const className = [
    'flex-row items-center justify-center gap-2',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    full ? 'w-full' : '',
    isDisabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Spring "squash" on press — premium tactile feel. Paired with a light haptic.
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => {
        if (isDisabled) return;
        scale.value = withSpring(0.955, { damping: 16, stiffness: 420 });
        if (haptic) haptics.tap();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      // Expose the text label as the accessible name so screen readers (and
      // Maestro E2E selectors) match the label exactly, not the label + the
      // decorative arrow/icon glyphs composed by default.
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={className}
      style={animatedStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={SPINNER_COLOR[variant]} />
      ) : (
        icon
      )}

      {children !== undefined && children !== null && children !== false && (
        <Text
          className={[
            'font-display font-extrabold',
            SIZE_TEXT_CLASSES[size],
            TEXT_COLOR[variant],
          ].join(' ')}
        >
          {children}
        </Text>
      )}

      {iconRight}

      {/* Phase C8 will replace this glyph with the real Icon component. */}
      {arrow && (
        <Text className={`${TEXT_COLOR[variant]} ${SIZE_TEXT_CLASSES[size]}`}>
          {'›'}
        </Text>
      )}
    </AnimatedPressable>
  );
}
