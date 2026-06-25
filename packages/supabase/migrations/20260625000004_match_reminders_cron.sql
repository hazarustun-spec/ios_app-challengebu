-- match_reminders: nudge both teams shortly before a scheduled match.
--
-- An accepted match stores played_at = the proposed date + time and stays in
-- 'awaiting_confirmation' until a score is agreed, so a match in that status
-- with a near-future played_at is an upcoming (not-yet-played) match. A 15-min
-- cron reminds each participant exactly once per match (deduped by an existing
-- match_reminders notification for the same match_id).
create or replace function public.match_reminder_check()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  pid uuid;
begin
  for m in
    select id, played_at, team_a_player_ids, team_b_player_ids
    from public.matches
    where status = 'awaiting_confirmation'
      and played_at > now()
      and played_at <= now() + interval '90 minutes'
  loop
    foreach pid in array (m.team_a_player_ids || m.team_b_player_ids)
    loop
      if not exists (
        select 1 from public.notifications
        where recipient_id = pid
          and category = 'match_reminders'
          and data->>'match_id' = m.id::text
      ) then
        insert into public.notifications (recipient_id, category, title, body, data)
        values (
          pid,
          'match_reminders',
          'Maç vakti yaklaşıyor! ⏰',
          'Maçın yaklaşıyor — saat '
            || to_char(m.played_at at time zone 'Europe/Istanbul', 'HH24:MI')
            || ', hazır ol ve sahaya çık! 🎾',
          jsonb_build_object('match_id', m.id, 'action', 'match_reminder')
        );
      end if;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.match_reminder_check() from authenticated, anon;

select cron.schedule(
  'match_reminder_check_15m',
  '*/15 * * * *',
  $$select public.match_reminder_check();$$
);
