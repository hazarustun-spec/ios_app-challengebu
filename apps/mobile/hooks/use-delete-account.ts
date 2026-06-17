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
      // Server revoked sessions globally; clear the local persisted session too.
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      signOutStore();
      qc.clear();
    },
  });
}
