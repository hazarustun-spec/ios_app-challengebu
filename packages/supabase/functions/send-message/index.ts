import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

const inputSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const { conversationId, body } = parsed.data;

    // Load conversation + verify the caller is a participant.
    const { data: conv } = await supa
      .from('conversations')
      .select('id, participant_low, participant_high')
      .eq('id', conversationId)
      .single();
    if (!conv) return errorResponse('Conversation not found', 404);

    const me = auth.userId;
    if (me !== conv.participant_low && me !== conv.participant_high) {
      return errorResponse('Not a participant of this conversation', 403);
    }
    const recipientId =
      me === conv.participant_low ? conv.participant_high : conv.participant_low;

    // Block check (either direction blocks messaging).
    // Two separate parameterised queries avoid interpolating UUIDs into a filter string.
    const [{ data: blockFwd }, { data: blockRev }] = await Promise.all([
      supa
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', conv.participant_low)
        .eq('blocked_id', conv.participant_high)
        .limit(1),
      supa
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', conv.participant_high)
        .eq('blocked_id', conv.participant_low)
        .limit(1),
    ]);
    if ((blockFwd && blockFwd.length > 0) || (blockRev && blockRev.length > 0)) {
      return errorResponse('Messaging is blocked between these users', 403);
    }

    // Insert the message.
    const { data: msg, error: msgErr } = await supa
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: me, body })
      .select('id, created_at')
      .single();
    if (msgErr) { console.error('[send-message]', msgErr); return errorResponse('Failed to send message', 500); }

    const preview = body.slice(0, 80);
    await supa
      .from('conversations')
      .update({ last_message_at: msg!.created_at, last_message_preview: preview })
      .eq('id', conversationId);

    // Sender display name for the notification/push title.
    const { data: sender } = await supa
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', me)
      .single();
    const senderName = sender
      ? `${sender.first_name} ${sender.last_name}`.trim()
      : 'Yeni mesaj';

    // Notification row + push, honouring the recipient's preference.
    const { data: notification } = await supa
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        category: 'message_received',
        title: senderName,
        body: preview,
        data: { conversationId },
      })
      .select('id')
      .single();

    const { data: pref } = await supa
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', recipientId)
      .eq('category', 'message_received')
      .single();

    if (pref?.enabled !== false) {
      const { data: tokens } = await supa
        .from('push_tokens')
        .select('token')
        .eq('profile_id', recipientId);
      if (tokens && tokens.length > 0) {
        const messages: ExpoPushMessage[] = tokens.map((t) => ({
          to: t.token,
          title: senderName,
          body: preview,
          data: { conversationId },
        }));
        try {
          await sendToExpo(messages);
          if (notification) {
            await supa
              .from('notifications')
              .update({ push_sent_at: new Date().toISOString() })
              .eq('id', notification.id);
          }
        } catch (pushErr) {
          console.error('Push failed:', pushErr);
        }
      }
    }

    return jsonResponse({ id: msg!.id, createdAt: msg!.created_at });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
