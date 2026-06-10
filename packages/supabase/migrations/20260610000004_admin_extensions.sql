-- Plan 8 Phase A4 — admin paneli backend uzantıları.
--
-- Three independent additions that the Plan 8 admin UI (Grup 9) needs:
--
-- 1. `profiles.suspended_until timestamptz` + daily `expire_suspensions()` cron.
--    Plan 7 added the `suspended` user_status value but had no "auto-unsuspend"
--    mechanism; admins could only set status manually. Plan 8 introduces
--    multi-duration suspends (3d / 7d / 30d / sınırsız) on the user actions
--    sheet, so the suspension end-time has to live on the profile row and a
--    cron has to flip status back to `active` once it elapses.
--    `suspended_until = NULL` while `status = 'suspended'` means a permanent
--    ban; the cron leaves NULLs alone.
--
-- 2. `admin_reorder_bracket_seeds(tournament_id, seed_player_ids uuid[8])`.
--    The Plan 8 admin_bracket screen supports drag-to-reorder the 8 finale
--    seeds. The underlying `tournament_matches` schema (see
--    20260606000006_seasons_tournaments.sql) stores integer `seed_a`/`seed_b`
--    that reference `season_standings.rank` — there is no uuid player column.
--    "Reordering seeds" therefore means rewriting `season_standings.rank` so
--    that `rank = i+1` corresponds to `seed_player_ids[i]`. The QF match
--    pairings (1v8, 4v5, 3v6, 2v7) stay constant; only the *players* holding
--    each integer seed move. This matches the UX ("admin drags Player B into
--    seed 1") and avoids a destructive schema migration.
--
-- 3. `admin_cron_status(lim integer)` — SECURITY DEFINER reader over
--    `cron.job_run_details` joined with `cron.job` for the admin Sistem
--    Sağlığı (system health) screen. The `cron` schema is normally not
--    granted to `authenticated`; this RPC fronts the read with an admin gate.
--
-- All RPCs raise `42501` for non-admin callers via the existing
-- `public.is_admin()` helper.

-- ── 1. Suspended timing ─────────────────────────────────────────────────────

alter table public.profiles
  add column suspended_until timestamptz;

comment on column public.profiles.suspended_until is
  'When status = suspended: NULL = permanent ban, timestamptz = auto-unsuspend at this moment (daily cron 03:00 TR). Set by admin actions in Plan 8 admin panel.';

create or replace function public.expire_suspensions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
    set status = 'active', suspended_until = null
    where status = 'suspended'
      and suspended_until is not null
      and suspended_until < now();
$$;

revoke all on function public.expire_suspensions() from public;
grant execute on function public.expire_suspensions() to authenticated;

select cron.schedule(
  'expire_suspensions_daily',
  '0 0 * * *',  -- 00:00 UTC = 03:00 TR (matches update_user_status_daily window)
  $$select public.expire_suspensions();$$
);

-- ── 2. Admin bracket seed reorder ──────────────────────────────────────────

create or replace function public.admin_reorder_bracket_seeds(
  tournament_id uuid,
  seed_player_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_season_id uuid;
  v_category match_category;
  i integer;
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  if array_length(seed_player_ids, 1) is null
     or array_length(seed_player_ids, 1) <> 8 then
    raise exception 'Expected exactly 8 seed player IDs (got %)',
      coalesce(array_length(seed_player_ids, 1), 0)
      using errcode = '22023';
  end if;

  -- Resolve the season + category the tournament belongs to, so we know which
  -- season_standings rows to renumber.
  select t.season_id, t.category
    into v_season_id, v_category
    from public.tournaments t
    where t.id = admin_reorder_bracket_seeds.tournament_id;
  if v_season_id is null then
    raise exception 'Tournament % not found',
      admin_reorder_bracket_seeds.tournament_id
      using errcode = 'P0002';
  end if;

  -- Re-assign ranks to match the requested player order. We do this in two
  -- passes to avoid the (season_id, profile_id, category) unique conflict
  -- temporarily (no rank-uniqueness constraint exists, but rewriting in place
  -- still requires the destination rank to be free — we park ranks in negative
  -- space first, then rewrite to 1..8).
  for i in 1..8 loop
    update public.season_standings
      set rank = -i
      where season_id = v_season_id
        and category = v_category
        and profile_id = seed_player_ids[i];
  end loop;

  for i in 1..8 loop
    update public.season_standings
      set rank = i
      where season_id = v_season_id
        and category = v_category
        and profile_id = seed_player_ids[i];
  end loop;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
    values (
      uid,
      'reorder_bracket',
      'tournament',
      admin_reorder_bracket_seeds.tournament_id,
      jsonb_build_object('seeds', to_jsonb(seed_player_ids))
    );
end;
$$;

revoke all on function public.admin_reorder_bracket_seeds(uuid, uuid[]) from public;
grant execute on function public.admin_reorder_bracket_seeds(uuid, uuid[]) to authenticated;

-- ── 3. Admin cron status surface ───────────────────────────────────────────

create or replace function public.admin_cron_status(lim integer default 50)
returns table (
  jobname text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  return_message text
)
language plpgsql
security definer
set search_path = public, cron
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  return query
    select
      j.jobname::text,
      d.status::text,
      d.start_time,
      d.end_time,
      d.return_message::text
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    order by d.start_time desc
    limit least(greatest(lim, 1), 200);
end;
$$;

revoke all on function public.admin_cron_status(integer) from public;
grant execute on function public.admin_cron_status(integer) to authenticated;
