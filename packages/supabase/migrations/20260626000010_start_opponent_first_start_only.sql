-- Fix doubles: duplicate push-to-start cards.
--
-- trg_start_opponent_activity (20260626000006_start_opponent_activity_trigger.sql)
-- fired on EVERY `started_by` change (WHEN new.started_by is distinct from
-- old.started_by). The handshake makes every participant tap "start" (each
-- appends their uid to started_by), so start-opponent-activity re-pushed a fresh
-- event:"start" to all not-yet-started participants on each tap → a non-starter
-- received 2-3 duplicate cards (server push-to-start is not deduped by the native
-- start() guard).
--
-- Recreate the trigger to fire ONLY on the first transition out of empty: the
-- very first "start" tap (started_by goes from [] to non-empty) pushes start to
-- all non-starters exactly once; subsequent handshake taps no longer re-fire.
-- Same trigger function (public.start_opponent_activity_on_update); only the WHEN
-- clause changes.
drop trigger if exists trg_start_opponent_activity on public.matches;
create trigger trg_start_opponent_activity
  after update on public.matches
  for each row
  when (cardinality(old.started_by) = 0 and cardinality(new.started_by) > 0)
  execute function public.start_opponent_activity_on_update();
