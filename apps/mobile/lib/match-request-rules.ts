// Client-side mirror of the match_requests delete policy.
//
// Source of truth: packages/supabase/migrations/
//   20260619000004_match_request_creator_delete.sql
//     create policy "Creator can delete own pending request"
//       on public.match_requests for delete to authenticated
//       using (auth.uid() = creator_id and status = 'pending');
//
// The policy is NOT restricted by `type`, so direct challenges are
// cancelable by their creator exactly like open calls.
//
// Pure module — no react-native / expo imports, so it stays testable.

export interface CancelableRequest {
  creator_id: string;
  status: string;
}

export function canCancelSentOffer(
  row: CancelableRequest,
  myUserId: string | undefined,
): boolean {
  if (!myUserId) return false;
  return row.creator_id === myUserId && row.status === 'pending';
}
