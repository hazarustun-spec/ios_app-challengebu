import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ year: z.number().int().min(2025).max(2100) });

const CATEGORIES = [
  'erkek_tek', 'kadin_tek', 'open_tek',
  'erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift',
];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { year } = parsed.data;
    let totalChampions = 0;

    for (const category of CATEGORIES) {
      const { data: standings } = await supa
        .from('season_standings')
        .select('profile_id, rank, seasons!inner(year)')
        .eq('category', category)
        .eq('seasons.year', year);

      const pointsByProfile = new Map<string, number>();
      for (const s of standings ?? []) {
        const points = s.rank === 1 ? 100 : s.rank === 2 ? 70 : s.rank <= 4 ? 50 : s.rank <= 8 ? 25 : 0;
        pointsByProfile.set(s.profile_id, (pointsByProfile.get(s.profile_id) ?? 0) + points);
      }

      const sorted = [...pointsByProfile.entries()].sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sorted.length; i++) {
        await supa.from('yearly_championship').upsert(
          {
            year,
            category,
            profile_id: sorted[i][0],
            total_finale_points: sorted[i][1],
            rank: i + 1,
          },
          { onConflict: 'year,category,profile_id' },
        );
      }
      if (sorted.length > 0) totalChampions++;
    }

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'calculate_yearly_championship',
      entity_type: 'year',
      details: { year, totalChampions },
    });

    return jsonResponse({ year, categoriesCalculated: totalChampions });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
