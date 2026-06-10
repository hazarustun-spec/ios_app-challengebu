-- Plan 8 Task A2 — match_request_applications + accept_match_application RPC.
--
-- Adds a parallel "open call" application surface that the new Plan 8 UI uses
-- (the legacy `open_call_applications` table + Edge Function flow stays in
-- place for the existing screens). The new flow supports a free-form `note`
-- from the applicant and atomically marks the request accepted via a single
-- RPC call from the creator.
--
-- IMPORTANT — semantic divergence from legacy open_call_applications:
-- The new accept_match_application RPC sets BOTH match_requests.status='accepted'
-- AND match_requests.target_id = applicant_user_id. The legacy
-- select-open-call-application Edge Function sets only status='accepted' and
-- leaves target_id NULL. Mobile UI consuming match_requests.target_id must
-- treat NULL on an 'accepted' open_call row as "legacy flow accepted, look up
-- via open_call_applications" until the legacy flow is migrated.
--
-- Schema notes:
--   * `match_requests` did not have an `accepted_at` column; this migration
--     adds it (nullable so existing rows are unaffected).
--   * `match_requests.direct_challenge_has_target` previously REQUIRED
--     `type = 'open_call'` to keep `target_id` NULL. That blocks the RPC
--     from filling in target_id on accept. We replace the constraint with one
--     that only enforces the NULL rule while the request is still `pending`,
--     so open calls can carry a target_id once accepted.

-- 1) match_requests: add accepted_at + relax CHECK constraint.

alter table public.match_requests
  add column accepted_at timestamptz;

alter table public.match_requests
  drop constraint direct_challenge_has_target;

alter table public.match_requests
  add constraint direct_challenge_has_target check (
    (type = 'direct_challenge' and target_id is not null)
    or (
      type = 'open_call'
      and (
        status <> 'pending' -- accepted/rejected/expired/completed may have target_id
        or target_id is null
      )
    )
  );

-- 2) match_request_applications table.

create table public.match_request_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(user_id) on delete cascade,
  applicant_partner_id uuid references public.profiles(user_id) on delete set null,
  note text,
  applied_at timestamptz not null default now(),
  unique (request_id, applicant_id)
);

comment on column public.match_request_applications.applicant_partner_id is
  'Doubles applicant partner (nullable for singles).';

create index match_request_applications_request_idx
  on public.match_request_applications (request_id);
create index match_request_applications_applicant_idx
  on public.match_request_applications (applicant_id);

alter table public.match_request_applications enable row level security;

-- Applicant can insert their own application — only against a pending open_call.
create policy "applicants insert own"
  on public.match_request_applications for insert
  to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.match_requests r
      where r.id = request_id
        and r.type = 'open_call'
        and r.status = 'pending'
    )
  );

-- Creator + applicant can read.
create policy "creator and applicant read"
  on public.match_request_applications for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.match_requests r
        where r.id = request_id and r.creator_id = auth.uid()
    )
  );

-- Applicant can withdraw (delete own).
create policy "applicant delete own"
  on public.match_request_applications for delete
  to authenticated
  using (applicant_id = auth.uid());

-- 3) accept_match_application RPC — only the creator can mark a request accepted.

-- Parameter names are prefixed with `p_` to avoid ambiguity with column names
-- inside the function body (PL/pgSQL would otherwise raise
-- "column reference 'request_id' is ambiguous" when the same identifier appears
-- as a column on `match_request_applications`). PostgREST resolves RPC argument
-- names from the function signature, so callers must use `p_request_id` /
-- `p_applicant_user_id` in the JSON body.
create or replace function public.accept_match_application(
  p_request_id uuid,
  p_applicant_user_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_creator_id uuid;
begin
  -- Lock the request row and pull status + creator in one shot so we can:
  --   (a) gate the RPC on creator_id without racing the UPDATE below
  --   (b) refuse to overwrite an already-accepted/rejected/expired/completed row
  select status, creator_id
    into v_status, v_creator_id
    from public.match_requests
    where id = p_request_id
    for update;

  if v_creator_id is null then
    raise exception 'Request not found'
      using errcode = '42704';
  end if;

  if v_creator_id <> uid then
    raise exception 'Only request creator can accept applications'
      using errcode = '42501';
  end if;

  if v_status <> 'pending' then
    raise exception 'Request is not pending'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.match_request_applications
      where request_id = p_request_id
        and applicant_id = p_applicant_user_id
  ) then
    raise exception 'No application found for that applicant'
      using errcode = '42704';
  end if;

  update public.match_requests
    set target_id = p_applicant_user_id,
        status = 'accepted',
        accepted_at = now()
    where id = p_request_id;
end;
$$;

revoke all on function public.accept_match_application(uuid, uuid) from public;
grant execute on function public.accept_match_application(uuid, uuid) to authenticated;
