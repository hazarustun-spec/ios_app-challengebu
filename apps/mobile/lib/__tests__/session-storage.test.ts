import { describe, expect, it } from 'bun:test';
import { type KeychainStore, createSessionStorage } from '../session-storage';

const AFTER_FIRST_UNLOCK = 0;
const WHEN_UNLOCKED = 5;
const KEY = 'sb-ref-auth-token';

/**
 * A keychain that behaves like the iOS one in the two ways this bug turns on:
 * an item keeps the accessibility it was CREATED with (a later set only
 * replaces the value), and while the phone is locked a WHEN_UNLOCKED item
 * cannot be read at all.
 */
function fakeKeychain() {
  const items = new Map<string, { value: string; accessible: number }>();
  let locked = false;
  const store: KeychainStore = {
    async getItemAsync(key) {
      const item = items.get(key);
      if (!item) return null;
      if (locked && item.accessible === WHEN_UNLOCKED) {
        throw new Error('errSecInteractionNotAllowed');
      }
      return item.value;
    },
    async setItemAsync(key, value, options) {
      const existing = items.get(key);
      items.set(key, {
        value,
        accessible: existing?.accessible ?? options?.keychainAccessible ?? WHEN_UNLOCKED,
      });
    },
    async deleteItemAsync(key) {
      items.delete(key);
    },
  };
  return {
    store,
    items,
    lock: () => {
      locked = true;
    },
  };
}

describe('session storage', () => {
  it('a session written now is readable while the phone is locked', async () => {
    const k = fakeKeychain();
    const storage = createSessionStorage(k.store, AFTER_FIRST_UNLOCK);
    await storage.setItem(KEY, 'session');
    k.lock();
    // The whole bug: this used to throw, and the app showed sign-in.
    expect(await storage.getItem(KEY)).toBe('session');
  });

  it('an existing session survives the update and is moved to the new item', async () => {
    const k = fakeKeychain();
    // What every current install has: the old default accessibility.
    await k.store.setItemAsync(KEY, 'old-session');
    const storage = createSessionStorage(k.store, AFTER_FIRST_UNLOCK);

    expect(await storage.getItem(KEY)).toBe('old-session');
    expect(k.items.has(KEY)).toBe(false);
    expect(k.items.get(`${KEY}.v2`)?.accessible).toBe(AFTER_FIRST_UNLOCK);

    k.lock();
    expect(await storage.getItem(KEY)).toBe('old-session');
  });

  it('writing the old key in place would NOT have fixed it', async () => {
    // Guards the reason for the new key name: an in-place set keeps the
    // accessibility the item was created with.
    const k = fakeKeychain();
    await k.store.setItemAsync(KEY, 'v1');
    await k.store.setItemAsync(KEY, 'v2', { keychainAccessible: AFTER_FIRST_UNLOCK });
    expect(k.items.get(KEY)?.accessible).toBe(WHEN_UNLOCKED);
  });

  it('a locked read is an error, not "signed out"', async () => {
    const k = fakeKeychain();
    await k.store.setItemAsync(KEY, 'old-session');
    k.lock();
    const storage = createSessionStorage(k.store, AFTER_FIRST_UNLOCK);
    await expect(storage.getItem(KEY)).rejects.toThrow('errSecInteractionNotAllowed');
  });

  it('sign-out removes both copies so neither comes back', async () => {
    const k = fakeKeychain();
    await k.store.setItemAsync(KEY, 'legacy');
    const storage = createSessionStorage(k.store, AFTER_FIRST_UNLOCK);
    await storage.setItem(KEY, 'current');
    await k.store.setItemAsync(KEY, 'legacy-again');
    await storage.removeItem(KEY);
    expect(await storage.getItem(KEY)).toBeNull();
  });
});
