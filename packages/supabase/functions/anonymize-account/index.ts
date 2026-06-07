import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    // Block deletion if user is the only admin.
    const { data: profile } = await supa
      .from('profiles')
      .select('role')
      .eq('user_id', auth.userId)
      .single();
    if (profile?.role === 'admin') {
      const { count: adminCount } = await supa
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((adminCount ?? 0) <= 1) {
        return forbidden('Cannot delete last admin. Assign another admin first.');
      }
    }

    // Anonymize profile in place (preserve user_id for ELO/match history integrity).
    await supa
      .from('profiles')
      .update({
        first_name: 'Eski',
        last_name: 'Üye',
        email: `anonymized-${auth.userId}@deleted.local`,
        phone: null,
        avatar_url: null,
        status: 'anonymized',
        pronoun_custom: null,
      })
      .eq('user_id', auth.userId);

    // Remove push tokens so the device stops receiving notifications.
    await supa.from('push_tokens').delete().eq('profile_id', auth.userId);

    // Audit trail.
    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'anonymize_account',
      entity_type: 'profile',
      entity_id: auth.userId,
      details: {},
    });

    // Revoke all sessions for the user. We cannot delete auth.users because of the
    // ON DELETE CASCADE on profiles.user_id, and we need the profile row to stay so
    // historical matches/ELO retain a valid foreign key. The user is locked out via
    // session revocation + anonymized email (which can no longer receive magic links).
    await supa.auth.admin.signOut(auth.userId, 'global');

    return jsonResponse({ status: 'anonymized' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
