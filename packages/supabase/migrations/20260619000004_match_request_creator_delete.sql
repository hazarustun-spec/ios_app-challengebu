-- Let a creator delete their own still-pending match request (e.g. cancel an
-- open call). Status-pinned so an accepted/completed request can't be deleted
-- out from under a match. FKs from open_call_applications + conversations are
-- ON DELETE CASCADE, so applications and any chat are cleaned up automatically.

create policy "Creator can delete own pending request"
  on public.match_requests for delete
  to authenticated
  using (auth.uid() = creator_id and status = 'pending');
