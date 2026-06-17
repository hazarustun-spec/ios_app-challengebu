-- Plan 8 (final) — add the message_received notification category.
-- NOTE: a new enum value cannot be USED in the same transaction that adds it,
-- so the default-preferences function that references it is updated in the
-- next migration (20260617000005).
alter type public.notification_category add value if not exists 'message_received';
