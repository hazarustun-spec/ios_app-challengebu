-- =============================================================================
-- 20260619000001_security_hardening.sql
-- Security hardening pass — 10 findings from pre-TestFlight security review.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1 (Critical) — profiles role-escalation
-- The UPDATE policy already limits USING/WITH CHECK to auth.uid() = user_id,
-- but at the column-grant level nothing prevents an authenticated user from
-- supplying role/status/email/kvkk_accepted_at in the update payload.
-- Revoke those columns so the Postgres column-ACL gate rejects them before RLS
-- even runs. The client (use-update-profile.ts) only writes:
--   first_name, last_name, pronoun, pronoun_custom, department_id,
--   show_department, class_year, show_class_year, skill_self_assessment,
--   dominant_hand, availability_windows, gender_category
-- — none of the privileged columns — so this revoke is safe.
-- ─────────────────────────────────────────────────────────────────────────────
revoke update (role, status, email, kvkk_accepted_at) on public.profiles from authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2 (Critical) — matches tampering
-- The mobile client NEVER calls .from('matches').update() directly (confirmed
-- by grep: no matches found in apps/mobile). All match writes go through edge
-- functions using the service-role key, which bypasses RLS. The over-broad
-- "Players can confirm their own matches" UPDATE policy lets any team member
-- overwrite score/winner/status/etc. Remove the UPDATE privilege entirely from
-- authenticated; service-role key is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Players can confirm their own matches" on public.matches;
revoke update on public.matches from authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3 (Critical) — pin search_path on 7 SECURITY DEFINER cron/trigger fns
-- Each function is altered to pin search_path = public so a rogue object
-- injected into another schema cannot hijack the call chain.
-- Public (anon role) execute access is also revoked — these functions are
-- called only by pg_cron (as superuser) or as a row trigger (as owner);
-- no anon or authenticated grant is needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- update_user_status() — no args (latest body: 20260609000007)
alter function public.update_user_status() set search_path = public;
revoke all on function public.update_user_status() from public;

-- expire_match_requests() — no args
alter function public.expire_match_requests() set search_path = public;
revoke all on function public.expire_match_requests() from public;

-- auto_confirm_matches() — no args
alter function public.auto_confirm_matches() set search_path = public;
revoke all on function public.auto_confirm_matches() from public;

-- cleanup_notifications() — no args
alter function public.cleanup_notifications() set search_path = public;
revoke all on function public.cleanup_notifications() from public;

-- cleanup_push_tokens() — no args
alter function public.cleanup_push_tokens() set search_path = public;
revoke all on function public.cleanup_push_tokens() from public;

-- season_lifecycle_check() — no args (latest body: 20260609000004)
alter function public.season_lifecycle_check() set search_path = public;
revoke all on function public.season_lifecycle_check() from public;

-- create_default_notification_preferences() — trigger fn, no args
-- (latest body: 20260617000005)
alter function public.create_default_notification_preferences() set search_path = public;
revoke all on function public.create_default_notification_preferences() from public;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4 (Important) — get_user_rankings + is_admin callable by anon
-- Revoke the implicit PUBLIC execute grant and restrict to authenticated only.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.get_user_rankings(uuid) from public;
grant execute on function public.get_user_rankings(uuid) to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 5 (Important) — expire_suspensions callable by any authenticated user
-- The original migration (20260610000004) erroneously granted EXECUTE to
-- authenticated. This is a cron-only function; revoke the grant.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.expire_suspensions() from public;
-- (no grant to authenticated — cron runs as superuser, which bypasses grants)


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 6 (Important) — open_call_applications leaks all applicants
-- The original "Authenticated can view applications" SELECT policy used
-- USING(true), exposing every applicant to every authenticated user.
-- Replace with a policy that limits visibility to the request creator and the
-- applicant themselves. Column names: creator_id on match_requests,
-- applicant_id on open_call_applications.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Authenticated can view applications" on public.open_call_applications;

create policy "Creator and applicant can view applications"
  on public.open_call_applications for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.match_requests r
      where r.id = match_request_id and r.creator_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 7 (Important) — messages UPDATE not column-restricted
-- The "recipient marks read" policy allows UPDATE on all columns, letting a
-- recipient overwrite body/sender_id/etc. of received messages.
-- Strategy: drop the policy, revoke table-level UPDATE from authenticated,
-- then grant only the read_at column, and recreate a narrow policy scoped to
-- the recipient marking their own received messages read.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "recipient marks read" on public.messages;
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "recipient marks read_at"
  on public.messages for update
  to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    and sender_id <> auth.uid()
  )
  with check (
    public.is_conversation_participant(conversation_id)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 8 (Important) — user_reports reporter can update/delete own reports
-- The "manage own reports" FOR ALL policy lets the reporter UPDATE or DELETE
-- their own report after filing it, which would let them retract or modify a
-- report before admin review. Replace with INSERT + SELECT only.
-- Also add a partial unique index to prevent spam (one pending report per pair).
-- Column names confirmed from 20260617000003: reporter_id, reported_id.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "manage own reports" on public.user_reports;

create policy "reporter insert own reports"
  on public.user_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "reporter select own reports"
  on public.user_reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Prevent filing duplicate pending reports against the same user
create unique index if not exists user_reports_one_pending_per_pair
  on public.user_reports (reporter_id, reported_id)
  where status = 'open';


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 9 (Important) — get_or_create_conversation one-sided check
-- The original function only validates that the CALLER belongs to the request,
-- not that p_other_user_id does. A caller could open a conversation with any
-- arbitrary user by pairing them with a request they're not party to.
-- Add a validation that p_other_user_id is also a participant of the request
-- (creator_id, target_id, or an applicant in match_request_applications).
-- Everything else (signature, search_path, grants) is kept identical.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_or_create_conversation(
  p_request_id uuid, p_other_user_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lo uuid := least(uid, p_other_user_id);
  hi uuid := greatest(uid, p_other_user_id);
  conv_id uuid;
begin
  if uid = p_other_user_id then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;

  -- Validate caller is a participant of the request.
  if not exists (
    select 1 from public.match_requests r
    where r.id = p_request_id and uid in (r.creator_id, r.target_id)
  ) and not exists (
    select 1 from public.match_request_applications a
    where a.request_id = p_request_id and a.applicant_id = uid
  ) then
    raise exception 'not a participant of this request' using errcode = '42501';
  end if;

  -- FIX 9: also validate that p_other_user_id is a participant of the request.
  if not exists (
    select 1 from public.match_requests r
    where r.id = p_request_id and p_other_user_id in (r.creator_id, r.target_id)
  ) and not exists (
    select 1 from public.match_request_applications a
    where a.request_id = p_request_id and a.applicant_id = p_other_user_id
  ) then
    raise exception 'other user is not a participant of this request' using errcode = '42501';
  end if;

  select id into conv_id from public.conversations
    where request_id = p_request_id and participant_low = lo and participant_high = hi;
  if conv_id is null then
    insert into public.conversations (request_id, participant_low, participant_high)
      values (p_request_id, lo, hi) returning id into conv_id;
  end if;
  return conv_id;
end; $$;
revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 10 (Important) — public_profiles view bypasses RLS
-- The view was created without SECURITY INVOKER, so it runs as the view owner
-- (postgres), bypassing the RLS policies on public.profiles. Adding
-- security_invoker = on makes the view run with the caller's privileges so RLS
-- is applied. Grants are re-applied to match the original migration.
-- ─────────────────────────────────────────────────────────────────────────────
drop view if exists public.public_profiles;

create or replace view public.public_profiles
  with (security_invoker = on)
as
select
  user_id,
  first_name,
  last_name,
  pronoun,
  pronoun_custom,
  gender_category,
  department_id,
  class_year,
  show_class_year,
  show_department,
  skill_self_assessment,
  dominant_hand,
  availability_windows,
  avatar_url,
  status,
  created_at,
  updated_at
from public.profiles;

grant select on public.public_profiles to authenticated, anon;
