// Where the Supabase session lives on the phone — and why it moved.
//
// THE BUG: people were asked for their e-mail again every few launches.
//
// The session used to be written to the keychain with expo-secure-store's
// default accessibility, WHEN_UNLOCKED: readable only while the phone is
// unlocked. But iOS starts apps in the background — a push arrives, a Live
// Activity token rotates — and that happens while the phone sits locked in a
// pocket. Our JS boots, supabase-js asks for the session, and the keychain
// refuses (errSecInteractionNotAllowed). supabase-js treats "could not read"
// like "nobody is signed in", the app settles on the sign-in screen, and the
// process stays alive like that. The next time the person opens the app it is
// already running — on the sign-in screen, with a perfectly valid session
// sitting unread in the keychain.
//
// THE FIX: AFTER_FIRST_UNLOCK — readable once the phone has been unlocked a
// single time since boot, which covers every background launch that matters.
// It is what Apple recommends for items a background task has to read, and it
// is still encrypted at rest and still bound to this device's keychain.
//
// WHY A NEW KEY NAME: a keychain item's accessibility is fixed when the item is
// created. expo-secure-store's set() on an existing item only updates the value
// and keeps the old accessibility, so writing the same key with the new option
// would change nothing. And delete-then-write would open a window in which a
// crash signs the person out — the exact thing we are fixing. So the session
// goes under `<key>.v2`, written NEW with the right accessibility, and the old
// item is deleted only AFTER the new one exists. Reads fall back to the old
// item until then, so nobody is signed out by the update itself.

export type KeychainStore = {
  getItemAsync(key: string, options?: KeychainOptions): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: KeychainOptions): Promise<void>;
  deleteItemAsync(key: string, options?: KeychainOptions): Promise<void>;
};

type KeychainOptions = { keychainAccessible?: number };

export const SESSION_KEY_SUFFIX = '.v2';

export function createSessionStorage(store: KeychainStore, afterFirstUnlock: number) {
  const options: KeychainOptions = { keychainAccessible: afterFirstUnlock };
  const current = (key: string) => `${key}${SESSION_KEY_SUFFIX}`;

  return {
    // Errors are NOT swallowed here. A read that fails has to reach the caller
    // as a failure — auth-bootstrap needs to tell "the keychain is locked, ask
    // again later" apart from "nobody is signed in". Returning null for both
    // is precisely what used to sign people out.
    async getItem(key: string): Promise<string | null> {
      const value = await store.getItemAsync(current(key), options);
      if (value !== null) return value;

      const legacy = await store.getItemAsync(key);
      if (legacy === null) return null;

      // Move it now rather than waiting for the next token refresh (up to an
      // hour away): until it moves, a locked-phone launch still cannot read it.
      // Best effort — if either step fails, the legacy item is still there and
      // this runs again on the next read.
      try {
        await store.setItemAsync(current(key), legacy, options);
        await store.deleteItemAsync(key);
      } catch {
        // keep serving the legacy value
      }
      return legacy;
    },

    async setItem(key: string, value: string): Promise<void> {
      await store.setItemAsync(current(key), value, options);
      // Only after the new item is safely written. If this delete fails the
      // stale legacy item is harmless: getItem never reads it while .v2 exists.
      try {
        await store.deleteItemAsync(key);
      } catch {
        // harmless, see above
      }
    },

    async removeItem(key: string): Promise<void> {
      // Both, so a sign-out cannot leave a legacy copy that getItem would
      // resurrect on the next launch.
      await store.deleteItemAsync(current(key));
      await store.deleteItemAsync(key);
    },
  };
}
