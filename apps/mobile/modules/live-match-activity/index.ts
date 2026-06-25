import { requireNativeModule } from 'expo';

const Native = requireNativeModule('LiveMatchActivity');

export default Native as {
  isSupported(): boolean;
  start(a: Record<string, unknown>): Promise<void>;
  update(s: Record<string, unknown>): Promise<void>;
  end(s: Record<string, unknown>): Promise<void>;
};
