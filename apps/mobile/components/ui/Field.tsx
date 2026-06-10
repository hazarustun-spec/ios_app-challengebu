// Field primitive — Plan 8 Phase C3.
//
// Ports the design bundle's `Field` component (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Field(...)`) to React Native + NativeWind.
//
// The original web component wraps an `<input>` with optional leading
// icon, trailing text suffix, label, hint, error state, and a `big`
// preset used in sign-in. Heights map 1:1 to the design (h-12 default,
// h-14 big — slightly tighter than the 50/58 web values to match the
// iOS touch target rhythm used by Button md/lg).
//
// Consumers: sign-in email entry, onboarding (name / phone / department),
// profile edit, dispute textarea, score entry, plus every screen that
// embeds the SearchBar preset (which delegates back to Field).
//
// Suffix supports an optional `onSuffixPress` so callers can wire up
// password-visibility toggles ("göster") and inline edit actions without
// reaching for a separate Pressable — matches the touch target the
// design renders as a tappable span.

import { Pressable, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../../theme/colors';

export type FieldType = 'text' | 'email' | 'password' | 'tel' | 'search';

export interface FieldProps {
  /** Optional small uppercase label rendered above the input. */
  label?: string;
  value?: string;
  /** Matches the design bundle's `onChange(v)` shape, not RN's event signature. */
  onChange?: (v: string) => void;
  placeholder?: string;
  /** Leading icon name (rendered via the Icon primitive at size 20). */
  icon?: IconName;
  /** Trailing text suffix (e.g. "göster", "set", "değiştir"). */
  suffix?: string;
  /** Optional press handler that turns the suffix into a tappable target. */
  onSuffixPress?: () => void;
  /**
   * Semantic input type — maps to keyboardType + secureTextEntry +
   * autoCapitalize / autoCorrect defaults. Explicit RN overrides below
   * take precedence so callers can opt out per-prop.
   */
  type?: FieldType;
  /** Shows red border + tints the hint text. */
  error?: boolean;
  /** Helper or error message rendered below the input. */
  hint?: string;
  /** Larger size (h-14 + 16px font) used by the sign-in screen. */
  big?: boolean;
  autoFocus?: boolean;
  // RN passthroughs — override the `type` defaults when supplied.
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  textInputProps?: Partial<TextInputProps>;
}

const TYPE_TO_KEYBOARD: Record<FieldType, KeyboardTypeOptions> = {
  text: 'default',
  email: 'email-address',
  password: 'default',
  tel: 'phone-pad',
  search: 'default',
};

const TYPE_TO_SECURE: Record<FieldType, boolean> = {
  text: false,
  email: false,
  password: true,
  tel: false,
  search: false,
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  suffix,
  onSuffixPress,
  type = 'text',
  error,
  hint,
  big,
  autoFocus,
  keyboardType,
  secureTextEntry,
  textInputProps,
}: FieldProps) {
  const heightClass = big ? 'h-14' : 'h-12';
  const fontSizeClass = big ? 'text-[16px]' : 'text-[14.5px]';
  const borderClass = error ? 'border-loss' : 'border-border-strong';

  return (
    <View className="w-full">
      {label && (
        <Text className="mb-2 text-[11px] font-extrabold tracking-[1.1px] uppercase text-text-3">
          {label}
        </Text>
      )}
      <View
        className={[
          'flex-row items-center rounded-md border-base bg-surface px-3',
          heightClass,
          borderClass,
        ].join(' ')}
      >
        {icon && <Icon name={icon} size={20} color={colors.text3} />}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          keyboardType={keyboardType ?? TYPE_TO_KEYBOARD[type]}
          secureTextEntry={secureTextEntry ?? TYPE_TO_SECURE[type]}
          autoFocus={autoFocus}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={type !== 'email' && type !== 'password'}
          className={['ml-2 flex-1 font-sans text-text', fontSizeClass].join(' ')}
          {...textInputProps}
        />
        {suffix &&
          (onSuffixPress ? (
            <Pressable
              onPress={onSuffixPress}
              accessibilityRole="button"
              className="ml-2 active:opacity-70"
            >
              <Text className="text-[12.5px] font-semibold text-text-2">{suffix}</Text>
            </Pressable>
          ) : (
            <Text className="ml-2 text-[12.5px] font-semibold text-text-2">{suffix}</Text>
          ))}
      </View>
      {hint && (
        <Text
          className={['mt-2 text-[12.5px]', error ? 'text-loss' : 'text-text-3'].join(' ')}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
