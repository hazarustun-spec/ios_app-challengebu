// Kept as a named alias so existing call sites (matches.tsx FeedList) keep
// reading naturally. The underlying delete is type-agnostic — see
// hooks/use-delete-match-request.ts.
export { useDeleteMatchRequest as useDeleteOpenCall } from './use-delete-match-request';
