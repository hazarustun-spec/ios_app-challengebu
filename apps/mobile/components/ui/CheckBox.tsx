// CheckBox / radio primitive — Plan 8 Phase C4.
//
// Ports the design bundle's `CheckBox` component (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function CheckBox(...)`) to React Native + NativeWind.
//
// One component handles both checkbox (default) and radio variants —
// `shape='circle'` rounds the box into a radio button. The visual rules
// follow the design source:
//   - unchecked: transparent fill, 2px border-strong outline
//   - checked: clay (ink) fill, white check icon
//
// The default size mirrors the design (24px box, 15px check). Callers
// can override via `size` — the inner check scales to 60% of the box
// edge.
//
// Consumers: müsaitlik 6-day grid, dispute reason radios (4 options),
// KVKK accept checkbox on sign-in, profile edit "Göster" radios.

import { Pressable } from 'react-native';
import { Icon } from './Icon';

export type CheckBoxShape = 'square' | 'circle';

export interface CheckBoxProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** square (default) renders a checkbox, circle renders a radio button. */
  shape?: CheckBoxShape;
  /** Edge length of the box. Default 24 (matches design). */
  size?: number;
  disabled?: boolean;
}

export function CheckBox({
  checked,
  onChange,
  shape = 'square',
  size = 24,
  disabled,
}: CheckBoxProps) {
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xs';
  const fillClass = checked
    ? 'bg-clay border-clay'
    : 'bg-transparent border-border-strong';

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      accessibilityRole={shape === 'circle' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked, disabled }}
      style={{ width: size, height: size }}
      className={[
        'items-center justify-center border-base',
        radiusClass,
        fillClass,
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {checked && (
        <Icon name="check" size={Math.round(size * 0.6)} color="#FFFFFF" stroke={3} />
      )}
    </Pressable>
  );
}
