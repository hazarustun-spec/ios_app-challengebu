-- Retention for chat messages.
--
-- `messages` had no retention policy at all, so it grew without bound — the
-- one high-write table in the app with nothing trimming it. `notifications`
-- (30 days) and `push_tokens` (60 days) already have cleanup crons; this is
-- the same pattern for chat.
--
-- Policy: delete messages older than 730 days (2 years). Deliberately
-- conservative — chat here is match coordination for a tennis community, so
-- two years is far beyond anything a player would scroll back to, while still
-- leaving plenty of room to loosen or tighten later.
--
-- Scope: `messages` ONLY. `conversations` rows are left untouched, so an old
-- thread still appears in the inbox (its denormalized `last_message_at` /
-- `last_message_preview` stay as they are) — it just has no body rows behind
-- it. There is no delete trigger on `messages`, so this cannot cascade into
-- `conversations`.
--
-- Note: `messages` is indexed on (conversation_id, created_at), so this
-- date-only predicate is a sequential scan. At the current table size that is
-- irrelevant; if the table ever grows enough for the nightly delete to show
-- up in query stats, add an index on `created_at`.

create or replace function public.cleanup_messages()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages where created_at < now() - interval '730 days';
end;
$$;

select cron.schedule(
  'cleanup_messages_daily',
  '0 2 * * *',  -- 02:00 UTC = 05:00 TR (between notifications and season crons)
  $$select public.cleanup_messages();$$
);
