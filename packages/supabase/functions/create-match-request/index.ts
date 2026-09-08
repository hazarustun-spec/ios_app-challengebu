import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  type: z.enum(['direct_challenge', 'open_call']),
  targetId: z.string().uuid().optional(),
  category: z.enum([
    'erkek_tek',
    'kadin_tek',
    'open_tek',
    'erkek_cift',
    'kadin_cift',
    'karma_cift',
    'open_cift',
  ]),
  format: z.enum(['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik']),
  isRated: z.boolean(),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
    (s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)),
    'proposedDate must be a valid calendar date',
  ),
  proposedTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).refine(
    (s) => {
      const [h, m] = s.split(':').map(Number);
      return h >= 0 && h < 24 && m >= 0 && m < 60;
    },
    'proposedTime must be a valid HH:MM time',
  ),
  courtId: z.string().uuid(),
  creatorPartnerId: z.string().uuid().optional(),
  targetPartnerId: z.string().uuid().optional(),
});

const MAX_PENDING_RATED = 3;
const EXPIRY_HOURS = 24;

type MatchCategory = z.infer<typeof inputSchema>['category'];
type GenderCategory = 'erkek' | 'kadin' | 'open_only';

// Who may play in a category — the INVERSE of the elo-seeding rule, which is
// the only place eligibility is actually defined. Source of truth:
//   packages/supabase/migrations/20260805000002_retire_karma_cift.sql
//     (seed_elo_ratings_for_profile, post-karma_cift retirement)
//   packages/supabase/migrations/20260806000001_reseed_elo_on_gender_change.sql
//     (seed_elo_ratings_on_gender_change — same array, on gender change)
// Both seed exactly:
//   erkek     → erkek_tek, open_tek, erkek_cift, open_cift
//   kadin     → kadin_tek, open_tek, kadin_cift, open_cift
//   open_only → open_tek, open_cift
// A player with no elo row in a category cannot be ranked in it, so that array
// IS the eligibility rule. Inverting it gives the audience for an open call.
//
// karma_cift is retired (20260805000002) and the client no longer offers it,
// but the input schema still accepts it. Its audience comes from the ORIGINAL
// seeding rule (20260714000001), where erkek and kadin were seeded for it and
// open_only was not — not invented here either.
const ELIGIBLE_GENDERS: Record<MatchCategory, GenderCategory[]> = {
  erkek_tek: ['erkek'],
  kadin_tek: ['kadin'],
  open_tek: ['erkek', 'kadin', 'open_only'],
  erkek_cift: ['erkek'],
  kadin_cift: ['kadin'],
  karma_cift: ['erkek', 'kadin'],
  open_cift: ['erkek', 'kadin', 'open_only'],
};

const CATEGORY_LABELS: Record<MatchCategory, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

// Fan-out guards. One open call notifies every eligible player, and each
// notification row also fires trg_dispatch_push → one pg_net POST to
// `dispatch-push` (20260625000001_push_dispatch_trigger.sql). Both numbers
// scale with community size, so cap the audience and chunk the insert the
// same way publish-announcement chunks its Expo batches.
const OPEN_CALL_MAX_RECIPIENTS = 1000;
const OPEN_CALL_INSERT_CHUNK = 100;

// One open call notifies the whole eligible community, and nothing else caps
// how many a player may post: MAX_PENDING_RATED only covers *rated* requests,
// so an excited player can open four unrated listings in a row and everyone
// gets four pushes. The listings still get created — this only silences the
// repeat announcement, so the extra calls are visible in the İlanlar tab
// without buzzing every phone again.
const OPEN_CALL_NOTIFY_COOLDOWN_HOURS = 6;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('Invalid input', 400, parsed.error.format());
    }
    const input = parsed.data;

    if (input.type === 'direct_challenge' && !input.targetId) {
      return errorResponse('targetId required for direct_challenge', 400);
    }
    if (input.type === 'open_call' && input.targetId) {
      return errorResponse('targetId must be null for open_call', 400);
    }
    if (input.type === 'direct_challenge' && input.targetId === auth.userId) {
      return errorResponse('Cannot challenge yourself', 400);
    }

    if (input.isRated) {
      const { count } = await supa
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', auth.userId)
        .eq('is_rated', true)
        .eq('status', 'pending');
      if ((count ?? 0) >= MAX_PENDING_RATED) {
        return conflict(`Maximum ${MAX_PENDING_RATED} pending rated requests allowed`);
      }
    }

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: row, error: insertErr } = await supa
      .from('match_requests')
      .insert({
        creator_id: auth.userId,
        type: input.type,
        target_id: input.targetId ?? null,
        category: input.category,
        format: input.format,
        is_rated: input.isRated,
        proposed_date: input.proposedDate,
        proposed_time: input.proposedTime,
        court_id: input.courtId,
        creator_partner_id: input.creatorPartnerId ?? null,
        target_partner_id: input.targetPartnerId ?? null,
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();

    if (insertErr) return errorResponse('Failed to create match request', 500, insertErr);

    // Notify the challenged player(s) — match_invitations for a direct
    // challenge, open_listings fan-out for an open call.
    if (input.type === 'direct_challenge' && input.targetId) {
      try {
        const { data: creator } = await supa
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', auth.userId)
          .single();
        const name =
          [creator?.first_name, creator?.last_name].filter(Boolean).join(' ').trim() ||
          'Bir oyuncu';
        const recipients = [input.targetId, input.targetPartnerId].filter(
          (id): id is string => Boolean(id),
        );
        await supa.from('notifications').insert(
          recipients.map((rid) => ({
            recipient_id: rid,
            category: 'match_invitations',
            title: 'Yeni meydan okuma! ⚡',
            body: `${name} seni maça davet etti — kabul et ve sahaya çık! 🎾`,
            data: {
              matchRequestId: row!.id,
              request_id: row!.id, // legacy key, kept until every device has the new client
              action: 'match_invitation',
            },
          })),
        );
      } catch (_e) {
        // A notification failure must never fail the request creation.
      }
    }

    // Open call → tell everyone who can actually play in this category. Until
    // now an open call was silent: only players who happened to open the
    // listings tab ever saw it.
    if (input.type === 'open_call') {
      try {
        // Rate-limit the announcement, not the listing. Look for an open-call
        // notification this player triggered inside the cooldown; if one
        // exists, skip the fan-out entirely.
        const cooldownSince = new Date(
          Date.now() - OPEN_CALL_NOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000,
        ).toISOString();
        const { count: recentAnnouncements } = await supa
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('category', 'open_listings')
          .eq('data->>createdBy', auth.userId)
          .gte('created_at', cooldownSince);

        if ((recentAnnouncements ?? 0) > 0) {
          console.info(
            '[create-match-request] open-call announcement suppressed (cooldown)',
            { creator: auth.userId, requestId: row!.id },
          );
          return jsonResponse({
            id: row!.id,
            status: row!.status,
            expiresAt: row!.expires_at,
          });
        }

        const { data: creator } = await supa
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', auth.userId)
          .single();
        const name =
          [creator?.first_name, creator?.last_name].filter(Boolean).join(' ').trim() ||
          'Bir oyuncu';

        const { data: eligible, error: eligibleErr } = await supa
          .from('profiles')
          .select('user_id')
          .in('gender_category', ELIGIBLE_GENDERS[input.category])
          .eq('status', 'active')
          .eq('is_demo', false) // the App Store review account is not a real player
          .neq('user_id', auth.userId) // never notify the caller about their own call
          .limit(OPEN_CALL_MAX_RECIPIENTS);
        if (eligibleErr) throw eligibleErr;

        // A doubles open call already carries its partner; they know about it.
        const excluded = new Set<string>(
          [auth.userId, input.creatorPartnerId].filter((id): id is string => Boolean(id)),
        );
        const recipients = (eligible ?? [])
          .map((p) => p.user_id as string)
          .filter((id) => !excluded.has(id));

        if ((eligible ?? []).length >= OPEN_CALL_MAX_RECIPIENTS) {
          // Not an error, but the day this trips the fan-out has outgrown a
          // synchronous request and needs a queue / digest instead.
          console.warn('create-match-request open_call fan-out hit the recipient cap', {
            requestId: row!.id,
            category: input.category,
            cap: OPEN_CALL_MAX_RECIPIENTS,
          });
        }

        const title = 'Yeni açık ilan! 🎾';
        const body = `${name} ${
          CATEGORY_LABELS[input.category]
        } için rakip arıyor — başvur ve sahaya çık! ⚡`;
        const rows = recipients.map((rid) => ({
          recipient_id: rid,
          category: 'open_listings' as const,
          title,
          body,
          data: {
            matchRequestId: row!.id,
            action: 'open_call_created',
            // Stamped so the cooldown check above can find this player's last
            // announcement without joining back through match_requests.
            createdBy: auth.userId,
          },
        }));

        // Chunked like publish-announcement's push fan-out: one oversized
        // insert that fails takes every recipient with it, and each row also
        // triggers a pg_net push dispatch, so keep the batches small and let a
        // bad chunk fail alone.
        for (let i = 0; i < rows.length; i += OPEN_CALL_INSERT_CHUNK) {
          const slice = rows.slice(i, i + OPEN_CALL_INSERT_CHUNK);
          const { error: chunkErr } = await supa.from('notifications').insert(slice);
          if (chunkErr) {
            console.error('create-match-request open_call fan-out chunk failed', {
              requestId: row!.id,
              offset: i,
              err: chunkErr,
            });
          }
        }
      } catch (e) {
        // Same contract as the direct-challenge block: a notification failure
        // must never fail the request creation. The listing already exists.
        console.error('create-match-request open_call fan-out failed', e);
      }
    }

    return jsonResponse({
      id: row!.id,
      status: row!.status,
      expiresAt: row!.expires_at,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
