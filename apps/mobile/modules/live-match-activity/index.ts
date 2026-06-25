import { requireOptionalNativeModule } from 'expo';

export type LiveMatchNative = {
  isSupported(): boolean;
  start(a: Record<string, unknown>): Promise<void>;
  update(s: Record<string, unknown>): Promise<void>;
  end(s: Record<string, unknown>): Promise<void>;
};

// Optional: returns null (never throws) when the native module isn't linked, so
// importing this never crashes the app at launch.
const Native = requireOptionalNativeModule<LiveMatchNative>('LiveMatchActivity');

export default Native;
