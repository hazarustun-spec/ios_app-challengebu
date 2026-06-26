import { requireOptionalNativeModule } from 'expo';

export type LiveMatchPushTokenEvent = { token: string };
// Per-activity push token tagged with the activity's own matchId.
export type LiveMatchActivityTokenEvent = { matchId: string; token: string };

// Mirrors expo-modules-core's EventSubscription (not re-exported from `expo`,
// and not directly resolvable here, so declared structurally).
export type LiveMatchSubscription = { remove(): void };

export type LiveMatchNative = {
  isSupported(): boolean;
  start(a: Record<string, unknown>): Promise<void>;
  update(s: Record<string, unknown>): Promise<void>;
  end(s: Record<string, unknown>): Promise<void>;
  // Device/user-level push-to-start token observer (iOS 17.2+; no-op otherwise).
  observePushToStartToken(): Promise<void>;
  // Observe push tokens of all current + future activities (incl. push-started).
  registerExistingActivityTokens(): Promise<void>;
  // Write user-level App Group auth context (no matchId) for the AwardPointIntent.
  writeAuthContext(a: Record<string, unknown>): Promise<void>;
  addListener(
    eventName: 'onPushToken' | 'onPushToStartToken',
    listener: (event: LiveMatchPushTokenEvent) => void,
  ): LiveMatchSubscription;
  addListener(
    eventName: 'onActivityPushToken',
    listener: (event: LiveMatchActivityTokenEvent) => void,
  ): LiveMatchSubscription;
};

// Optional: returns null (never throws) when the native module isn't linked, so
// importing this never crashes the app at launch.
const Native = requireOptionalNativeModule<LiveMatchNative>('LiveMatchActivity');

export default Native;
