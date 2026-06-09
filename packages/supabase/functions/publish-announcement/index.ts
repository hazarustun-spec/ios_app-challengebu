import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

const inputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  targetFilter: z
    .object({
      genderCategory: z.enum(['erkek', 'kadin', 'open_only']).optional(),
      onlyActive: z.boolean().optional(),
    })
    .optional(),
  sendPush: z.boolean().optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;
    const filter = input.targetFilter ?? {};

    const { data: announcement, error: insertErr } = await supa
      .from('announcements')
      .insert({
        created_by: auth.userId,
        title: input.title,
        body: input.body,
        target_filter: filter,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insertErr || !announcement) {
      return errorResponse(insertErr?.message ?? 'Insert failed', 500);
    }

    let recipientsQuery = supa.from('profiles').select('user_id');
    if (filter.genderCategory) {
      recipientsQuery = recipientsQuery.eq('gender_category', filter.genderCategory);
    }
    if (filter.onlyActive) {
      recipientsQuery = recipientsQuery.eq('status', 'active');
    }
    const { data: recipients, error: recipErr } = await recipientsQuery;
    if (recipErr) return errorResponse(recipErr.message, 500);

    const ids = (recipients ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      return jsonResponse({
        announcementId: announcement.id,
        recipientCount: 0,
        pushed: 0,
      });
    }

    const rows = ids.map((id) => ({
      recipient_id: id,
      category: 'community_announcements' as const,
      title: input.title,
      body: input.body,
      data: { announcementId: announcement.id },
    }));
    await supa.from('notifications').insert(rows);

    let pushed = 0;
    if (input.sendPush) {
      const { data: tokens } = await supa
        .from('push_tokens')
        .select('token, profile_id')
        .in('profile_id', ids);
      const { data: prefs } = await supa
        .from('notification_preferences')
        .select('profile_id, enabled')
        .eq('category', 'community_announcements')
        .in('profile_id', ids);
      const disabled = new Set(
        (prefs ?? []).filter((p) => p.enabled === false).map((p) => p.profile_id),
      );
      const messages: ExpoPushMessage[] = (tokens ?? [])
        .filter((t) => !disabled.has(t.profile_id))
        .map((t) => ({
          to: t.token,
          title: input.title,
          body: input.body,
          data: { announcementId: announcement.id },
        }));
      if (messages.length > 0) {
        try {
          await sendToExpo(messages);
          pushed = messages.length;
        } catch (pushErr) {
          console.error('publish-announcement push fanout failed', pushErr);
        }
      }
    }

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'publish_announcement',
      entity_type: 'announcement',
      entity_id: announcement.id,
      details: { recipientCount: ids.length, pushed, sendPush: input.sendPush ?? false },
    });

    return jsonResponse({
      announcementId: announcement.id,
      recipientCount: ids.length,
      pushed,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
