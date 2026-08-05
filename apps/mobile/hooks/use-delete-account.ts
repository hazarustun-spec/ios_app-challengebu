import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

/**
 * Permanently delete (anonymize) the signed-in account.
 *
 * Apple App Store guideline 5.1.1(v) requires apps that support account
 * creation to let users delete their account in-app. The `anonymize-account`
 * Edge Function scrubs the profile in place (preserving user_id so ELO/match
 * history stay consistent — the player shows as "Silinmiş Oyuncu"), removes
 * push tokens, writes an audit row, and revokes all server sessions.
 *
 * The token is read BEFORE signing out so the function can authenticate as the
 * still-signed-in user. The Edge Function may reject deletion of the last
 * remaining admin — that error surfaces to the caller.
 */
export function useDeleteAccount() {
  const qc = useQueryClient();
  const signOutStore = useAuthStore((s) => s.signOut);

  return useMutation({
    mutationFn: async () => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      await invokeFunction('anonymize-account', {}, token);

      // Clear the locally persisted session.
      //
      // `scope: 'local'` matters. The Edge Function has already called
      // `auth.admin.signOut(userId, 'global')`, so by the time we get here the
      // refresh token is dead server-side. A default (global) signOut would
      // POST to /logout with that dead token, get a 401/403 back, and throw —
      // which used to abort this mutation before `onSuccess` ran. The result:
      // the session stayed in SecureStore, the caller never navigated to
      // /(auth)/welcome, and the next cold start booted straight back into the
      // app on a tombstoned profile. `scope: 'local'` only touches storage, so
      // there is nothing left to fail.
      //
      // The try/catch is belt-and-braces: the account IS deleted at this point,
      // so no storage-layer error may turn this into a failed mutation.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn('[delete-account] local signOut failed (continuing)', err);
      }
    },
    onSuccess: () => {
      signOutStore();
      qc.clear();
    },
  });
}
