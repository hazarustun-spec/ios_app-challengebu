-- Plan 8 — "Yeni mesaj" compose: list everyone the caller can message.
--
-- A contact exists for the current user (U) when they share at least one
-- match_request.  Four paths contribute contacts:
--   1. Direct challenges U created:      creator_id = U AND target_id IS NOT NULL  → other = target_id
--   2. Direct challenges targeting U:    target_id  = U                            → other = creator_id
--   3. Open calls U created:             creator_id = U, type = 'open_call'         → other = each applicant
--   4. Open calls U applied to:          applicant_id = U                           → other = creator_id
--
-- Deduplication: for each distinct other_user_id, keep the row whose
-- underlying match_request has the MOST RECENT created_at (DISTINCT ON
-- after ordering by other_user_id, created_at DESC).
--
-- Exclusions:
--   • self  (other_user_id = auth.uid())
--   • any pair where a user_blocks row exists in EITHER direction

create or replace function public.list_messageable_contacts()
returns table (
  other_user_id uuid,
  request_id    uuid,
  first_name    text,
  last_name     text,
  avatar_url    text,
  last_at       timestamptz
)
language sql stable security definer set search_path = public
as $$
  -- Build the raw candidate set: (other_user_id, request_id, created_at)
  with candidates as (

    -- 1. Direct challenges created by U → target is the other party
    select
      r.target_id      as other_user_id,
      r.id             as request_id,
      r.created_at
    from public.match_requests r
    where r.creator_id = auth.uid()
      and r.target_id is not null

    union all

    -- 2. Requests targeting U → creator is the other party
    select
      r.creator_id     as other_user_id,
      r.id             as request_id,
      r.created_at
    from public.match_requests r
    where r.target_id = auth.uid()

    union all

    -- 3. Open calls U created → each applicant is a contact
    select
      a.applicant_id   as other_user_id,
      r.id             as request_id,
      r.created_at
    from public.match_requests r
    join public.match_request_applications a on a.request_id = r.id
    where r.creator_id = auth.uid()
      and r.type = 'open_call'

    union all

    -- 4. Open calls U applied to → the creator is the other party
    select
      r.creator_id     as other_user_id,
      r.id             as request_id,
      r.created_at
    from public.match_request_applications a
    join public.match_requests r on r.id = a.request_id
    where a.applicant_id = auth.uid()

  ),

  -- Deduplicate: one row per other_user_id, using the most-recent request
  deduped as (
    select distinct on (c.other_user_id)
      c.other_user_id,
      c.request_id,
      c.created_at as last_at
    from candidates c
    -- Exclude self
    where c.other_user_id <> auth.uid()
    -- Exclude blocked pairs (either direction)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = c.other_user_id)
           or (b.blocker_id = c.other_user_id and b.blocked_id = auth.uid())
      )
    order by c.other_user_id, c.created_at desc
  )

  select
    d.other_user_id,
    d.request_id,
    p.first_name::text,
    p.last_name::text,
    p.avatar_url::text,
    d.last_at
  from deduped d
  join public.profiles p on p.user_id = d.other_user_id
  order by d.last_at desc;
$$;

revoke all  on function public.list_messageable_contacts() from public;
grant execute on function public.list_messageable_contacts() to authenticated;
