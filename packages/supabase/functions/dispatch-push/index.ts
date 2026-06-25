import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

// Delivers a push for an ALREADY-CREATED notification row.
//
// Invoked by the `trg_dispatch_push` AFTER-INSERT trigger on
// public.notifications (via pg_net), so every notification any feature
// creates — badges, match invitations, open-call applications, messages,
// etc. — also reaches the device, gated by the recipient's per-category
// preference.
//
// Auth: internal-only. The trigger passes INTERNAL_PUSH_KEY as the Bearer
// token (mirrored into both the function env and Vault), so we can't rely on
// SUPABASE_SERVICE_ROLE_KEY matching (its value differs under the new API-key
// system). We compare the Bearer against INTERNAL_PUSH_KEY directly.
const inputSchema = z.object({ notificationId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const internalKey = Deno.env.get('INTERNAL_PUSH_KEY');
    const token = (req.headers.get('authorization') ?? '').replace(
      /^Bearer\s+/i,
      '',
    );
    if (!internalKey || token !== internalKey) {
      return errorResponse('Forbidden', 401);
    }

    const supa = getServiceClient();
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const { notificationId } = parsed.data;

    const { data: n } = await supa
      .from('notifications')
      .select('id, recipient_id, category, title, body, data, push_sent_at')
      .eq('id', notificationId)
      .single();
    if (!n) return jsonResponse({ pushed: false, reason: 'not_found' });
    if (n.push_sent_at) return jsonResponse({ pushed: false, reason: 'already_sent' });

    // Per-category preference (default ON when the recipient has no row).
    const { data: pref } = await supa
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', n.recipient_id)
      .eq('category', n.category)
      .maybeSingle();
    if (pref?.enabled === false) {
      return jsonResponse({ pushed: false, reason: 'preference_off' });
    }

    const { data: tokens } = await supa
      .from('push_tokens')
      .select('token')
      .eq('profile_id', n.recipient_id);
    if (!tokens || tokens.length === 0) {
      return jsonResponse({ pushed: false, reason: 'no_tokens' });
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: n.title,
      body: n.body,
      data: (n.data as Record<string, unknown> | null) ?? undefined,
    }));

    try {
      await sendToExpo(messages);
      await supa
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() })
        .eq('id', n.id);
      return jsonResponse({ pushed: true, tokenCount: tokens.length });
    } catch (pushErr) {
      console.error('[dispatch-push]', pushErr);
      return jsonResponse({ pushed: false, reason: 'expo_error' });
    }
  } catch (err) {
    return internalError(err);
  }
});
