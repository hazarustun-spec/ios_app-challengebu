// Toast primitive — Plan 8 Phase C7.
//
// The Toast itself is a small, presentational ink-pill: a dark surface with
// a tone-tinted icon and short message. Imperative orchestration (showing,
// auto-dismiss, slide-up animation, positioning) lives in `ToastProvider`
// — keeping the visual component pure makes it trivial to snapshot.
//
// Design bundle reference: there is no standalone Toast in
//   docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// — toasts are invoked imperatively via `nav.toast('...')` throughout the
// screens-*.jsx files (see, e.g., `screens-match-flow.jsx`:250
// `nav.toast('Teklif gönderildi · ' + oppName)`). The visual treatment
// below mirrors the spec: ink background, lime check on success, white
// message text.

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

export type ToastVariant = 'success' | 'info' | 'error';

export interface ToastViewProps {
  variant?: ToastVariant;
  message: string;
}

const ICON_BY_VARIANT: Record<ToastVariant, IconName> = {
  success: 'check',
  info: 'info',
  error: 'xCircle',
};

function iconColorFor(variant: ToastVariant): string {
  switch (variant) {
    case 'error':
      return colors.loss;
    case 'info':
    case 'success':
    default:
      // Both info + success use the lime accent on the ink pill — the
      // dark surface already carries the semantic weight; the lime check
      // is the visual anchor.
      return colors.lime;
  }
}

export function ToastView({ variant = 'success', message }: ToastViewProps) {
  const iconName = ICON_BY_VARIANT[variant];
  const iconColor = iconColorFor(variant);
  return (
    <View
      className="flex-row items-center gap-2.5 rounded-md px-4 py-3"
      style={{ backgroundColor: colors.text }}
    >
      <Icon name={iconName} size={18} color={iconColor} stroke={3} />
      <Text className="font-sans text-[13.5px] font-bold text-white">
        {message}
      </Text>
    </View>
  );
}
