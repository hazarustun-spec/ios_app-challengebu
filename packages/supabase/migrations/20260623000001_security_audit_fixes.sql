-- =============================================================================
-- 20260623000001_security_audit_fixes.sql
-- Security audit follow-up — 7 hardening fixes identified after the
-- 20260619000001_security_hardening.sql pass.
-- Safe to run on both a fresh schema and an existing populated database.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1 — user_badges: restrict UPDATE to pinned_at only
-- Without this, an authenticated user could change badge_id on their own row
-- to swap in a more prestigious badge they haven't actually earned.
-- Revoke table-level UPDATE and re-grant the single column clients legitimately
-- write (the pin/unpin toggle). RLS policies already gate WHO can update.
-- ─────────────────────────────────────────────────────────────────────────────
revoke update on public.user_badges from authenticated;
grant  update (pinned_at) on public.user_badges to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2 — notifications: restrict UPDATE to read_at only
-- All notification columns are currently overwritable by any authenticated
-- user (subject to RLS). The only legitimate client write is marking a
-- notification read; revoke table-level UPDATE and grant only that column.
-- ─────────────────────────────────────────────────────────────────────────────
revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3 — match_requests: restrict UPDATE columns
-- A creator could change is_rated, category, or expires_at after creation to
-- manipulate ELO impact or bypass expiry. Allow only the columns that are
-- legitimately edited while a request is pending (rescheduling fields, partner
-- selection) plus the status column that the target sets on accept/reject.
-- RLS policies already gate WHO can perform each update.
-- NOTE: accept_match_application RPC and the accept-match-request Edge Function
-- run as SECURITY DEFINER / service-role and bypass column grants entirely, so
-- the accept flow (which writes target_id, status, accepted_at) is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────
revoke update on public.match_requests from authenticated;
grant  update (status, proposed_date, proposed_time, court_id,
               creator_partner_id, target_partner_id)
  on public.match_requests to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4 — match_request_applications: add status guard to applicant DELETE
-- An applicant could currently delete their application row even after the
-- creator has already accepted it (setting match_requests.status = 'accepted'),
-- which would orphan the accepted match. Drop and recreate the policy so DELETE
-- is blocked once the parent request has been accepted.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "applicant delete own" on public.match_request_applications;

create policy "applicant delete own"
  on public.match_request_applications for delete to authenticated
  using (
    applicant_id = auth.uid()
    and not exists (
      select 1 from public.match_requests r
      where r.id = request_id and r.status = 'accepted'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 5 — public_profiles: remove anon SELECT access
-- The view exposes the `status` column (active / suspended / banned), which
-- unauthenticated clients (app before sign-in, web scrapers) should not see.
-- The security_invoker fix in 20260619000001 already ensures RLS on the
-- underlying profiles table is applied; this revoke closes the final gap at
-- the view's own grant level.
-- ─────────────────────────────────────────────────────────────────────────────
revoke select on public.public_profiles from anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 6 — season_doubles_teams: remove anon from SELECT policy
-- The existing policy was created with `TO authenticated, anon USING (true)`.
-- Anon access is unnecessary (doubles standings are only shown to signed-in
-- users in the app) and inconsistent with the profiles → public_profiles
-- anon-removal above. Drop the overly broad policy and recreate it for
-- authenticated only.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Doubles teams readable by authenticated" on public.season_doubles_teams;

create policy "Doubles teams readable by authenticated"
  on public.season_doubles_teams for select
  to authenticated
  using (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 7 — match_score_submissions: unique (match_id, submitted_by)
-- Currently multiple rows with the same (match_id, submitted_by) are possible
-- (e.g. from test data or a retry race), which creates consensus ambiguity:
-- the auto_confirm_matches cron cannot reliably determine whether two players
-- agree when one player has submitted twice with different scores.
-- Step 1: deduplicate — keep only the most-recent submission per (match_id,
--   submitted_by) pair so the constraint can be added safely on a populated DB.
-- Step 2: add the unique constraint.
-- ─────────────────────────────────────────────────────────────────────────────

-- Deduplicate: delete older duplicates, keeping the row with the latest
-- submitted_at for each (match_id, submitted_by) pair.
delete from public.match_score_submissions s
using public.match_score_submissions s2
where s.match_id = s2.match_id
  and s.submitted_by = s2.submitted_by
  and s.submitted_at < s2.submitted_at;

alter table public.match_score_submissions
  add constraint uq_score_submission_per_player unique (match_id, submitted_by);
