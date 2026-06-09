-- Extend `user_status` enum with admin moderation states.
--
-- Plan 7 Faz F adds admin "Askıya al" (suspend) and "Banla" (ban) actions on
-- profiles. The original Plan 1 profile migration defined `user_status` with
-- lifecycle states only (active / frozen_30 / hibernating_60 / inactive_90 /
-- anonymized); the two moderation states were deferred. The operator approved
-- adding them now so Faz F mutations can land end-to-end.
--
-- `ADD VALUE IF NOT EXISTS` makes the migration idempotent across reruns and
-- across environments that may already have these values.

alter type user_status add value if not exists 'suspended';
alter type user_status add value if not exists 'banned';
