-- Hardening pass for Plan 5 Faz C code review:
--
-- 1. Drop profiles.pinned_badge_ids — never read in the UI (user_badges.pinned_at
--    is canonical). Keeping it created drift risk on partial-failure of the old
--    3-call pin mutation.
-- 2. Add a partial unique index for non-seasonal badges so award-badges TOCTOU
--    races can't insert duplicate rows. (The existing unique (profile_id,
--    badge_id, season_id) treats NULL season_id as distinct.)
-- 3. Create pin_badges(badge_ids uuid[]) RPC so the client gets a transactional,
--    server-enforced max-3 pin operation instead of three sequential REST calls
--    with no rollback and no cardinality enforcement.

alter table public.profiles drop constraint if exists pinned_badges_max_three;
alter table public.profiles drop column if exists pinned_badge_ids;

create unique index if not exists user_badges_non_seasonal_uniq
  on public.user_badges (profile_id, badge_id)
  where season_id is null;

create or replace function public.pin_badges(badge_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if coalesce(array_length(badge_ids, 1), 0) > 3 then
    raise exception 'En fazla 3 rozet seçebilirsin' using errcode = '22023';
  end if;

  update public.user_badges
    set pinned_at = null
    where profile_id = uid and pinned_at is not null;

  if array_length(badge_ids, 1) > 0 then
    update public.user_badges
      set pinned_at = now()
      where profile_id = uid and badge_id = any(badge_ids);
  end if;
end;
$$;

revoke all on function public.pin_badges(uuid[]) from public;
grant execute on function public.pin_badges(uuid[]) to authenticated;
