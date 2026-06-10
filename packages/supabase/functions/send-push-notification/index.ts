import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

// Mirror of public.notification_category enum
// (see packages/supabase/migrations/20260610000003_notification_category_revise.sql).
// Kept inline because Edge Functions can't easily import from the TS workspace.
const inputSchema = z.object({
  recipientId: z.string().uuid(),
  category: z.enum([
    'match_invitations', 'match_score_pending', 'badges_earned',
    'season_lifecycle', 'ladder_movement', 'community_announcements',
    'open_listings', 'match_reminders',
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;

    const { data: notification } = await supa.from('notifications').insert({
      recipient_id: input.recipientId,
      category: input.category,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    }).select('id').single();

    const { data: pref } = await supa
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', input.recipientId)
      .eq('category', input.category)
      .single();

    if (pref?.enabled === false) {
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'preference_off' });
    }

    const { data: tokens } = await supa
      .from('push_tokens')
      .select('token')
      .eq('profile_id', input.recipientId);

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'no_tokens' });
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: input.title,
      body: input.body,
      data: input.data,
    }));

    try {
      await sendToExpo(messages);
      await supa.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notification!.id);
      return jsonResponse({ notificationId: notification!.id, pushed: true, tokenCount: tokens.length });
    } catch (pushErr) {
      console.error('Push failed:', pushErr);
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'expo_error' });
    }
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
