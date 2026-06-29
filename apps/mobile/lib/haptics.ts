// Semantic haptic vocabulary — one place so the whole app speaks the same
// "feel". Fire-and-forget (never await); expo-haptics no-ops where unsupported.
//
//   haptics.tap()      — light press feedback (buttons, taps)
//   haptics.select()   — selection change (pickers, toggles, segmented)
//   haptics.medium()   — a committed action (confirm, send, accept)
//   haptics.heavy()    — a weighty action (start match, finish)
//   haptics.success()  — positive outcome (win, badge, level up)
//   haptics.warning()  — caution (void, dispute, conflict)
//   haptics.error()    — failure (rejected, invalid)

import * as Haptics from 'expo-haptics';

function safe(run: () => Promise<unknown>): void {
  // Haptics throw on no engine (e.g. simulator quirks) — never surface that.
  run().catch(() => {});
}

export const haptics = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safe(() => Haptics.selectionAsync()),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
