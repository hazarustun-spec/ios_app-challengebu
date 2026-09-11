-- Undo the match recorded against the WRONG opponent, then settle the real one.
--
-- WHAT WENT WRONG
--   On 11 Sep a Pro Set 8-4 was recorded through admin-record-match against
--   "Emre Y" (emre.yuksel@...), in Open Tek. The match was actually played
--   against Yunus Emre Yildirim, in Erkek Tek, on 8 Sep - and that match was
--   already in the database, voided at 0-0. The correction should have
--   re-scored that row instead of creating a new one.
--
-- WHAT THIS DOES
--   Part 1 (all-or-nothing, raises on any doubt):
--     - finds the wrong match: exactly one confirmed pro_set_8 between Hazar
--       and Emre Y that admin-record-match created (it has that audit row -
--       a match the players played themselves is never touched)
--     - checks both Open Tek ratings are STILL what that match left them at;
--       if anything else moved them since, it refuses rather than guess
--     - puts both Open Tek ratings and match counts back
--     - deletes every notification that points at it (the push
--       itself has already been delivered and cannot be recalled)
--     - deletes the match row, restores last_match_at, and writes an audit row
--   Part 2 (never undoes Part 1):
--     - finds the real match: exactly one VOIDED singles pro_set_8 involving
--       Hazar whose opponent's first name starts with "Yunus"
--     - asks admin-record-match to RESCORE it 8-4 to Yunus Emre. Category,
--       format and teams all come from that row, so nothing is guessed.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste the WHOLE file -> Run.
--   The result table is a step-by-step report. ELO for the real match lands a
--   few seconds later (pg_net sends after the run commits) - check it with
--   the verification query afterwards.

create temp table if not exists _fix_report (step int, what text, detail text);
delete from _fix_report;

-- ---- Part 1: revert the wrong match ----------------------------------------
do $$
declare
  c_hazar_email constant text := 'hazar.ustun@std.bogazici.edu.tr';
  c_wrong_email constant text := 'emre.yuksel@std.bogazici.edu.tr';
  v_hazar uuid;
  v_wrong uuid;
  w public.matches;
  v_count int;
  v_notes int;
  v_wrong_before int;
  v_wrong_after int;
  v_hazar_before int;
  v_hazar_after int;
  v_cur_wrong int;
  v_cur_hazar int;
begin
  select p.user_id into v_hazar
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_hazar_email);
  if v_hazar is null then raise exception 'Hazar account not found'; end if;

  select p.user_id into v_wrong
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_wrong_email);
  if v_wrong is null then raise exception 'Emre Y account not found'; end if;

  select count(*) into v_count
    from public.matches m
   where m.format = 'pro_set_8' and m.status = 'confirmed'
     and ( (m.team_a_player_ids = array[v_wrong] and m.team_b_player_ids = array[v_hazar])
        or (m.team_a_player_ids = array[v_hazar] and m.team_b_player_ids = array[v_wrong]) )
     and exists (select 1 from public.audit_log a
                  where a.action = 'admin_record_match' and a.entity_id = m.id);
  if v_count <> 1 then
    raise exception 'Expected exactly 1 admin-recorded match with Emre Y, found % - nothing changed', v_count;
  end if;

  select m.* into w
    from public.matches m
   where m.format = 'pro_set_8' and m.status = 'confirmed'
     and ( (m.team_a_player_ids = array[v_wrong] and m.team_b_player_ids = array[v_hazar])
        or (m.team_a_player_ids = array[v_hazar] and m.team_b_player_ids = array[v_wrong]) )
     and exists (select 1 from public.audit_log a
                  where a.action = 'admin_record_match' and a.entity_id = m.id);

  if w.team_a_player_ids = array[v_wrong] then
    v_wrong_before := w.rating_before_team_a; v_wrong_after := w.rating_after_team_a;
    v_hazar_before := w.rating_before_team_b; v_hazar_after := w.rating_after_team_b;
  else
    v_wrong_before := w.rating_before_team_b; v_wrong_after := w.rating_after_team_b;
    v_hazar_before := w.rating_before_team_a; v_hazar_after := w.rating_after_team_a;
  end if;

  select rating into v_cur_wrong from public.elo_ratings
   where profile_id = v_wrong and category = w.category;
  select rating into v_cur_hazar from public.elo_ratings
   where profile_id = v_hazar and category = w.category;
  if v_cur_wrong is distinct from v_wrong_after or v_cur_hazar is distinct from v_hazar_after then
    raise exception 'Ratings moved since that match (now %/%, it left %/%) - not reverting blindly',
      v_cur_wrong, v_cur_hazar, v_wrong_after, v_hazar_after;
  end if;

  update public.elo_ratings
     set rating = v_wrong_before, matches_played = greatest(matches_played - 1, 0)
   where profile_id = v_wrong and category = w.category;
  update public.elo_ratings
     set rating = v_hazar_before, matches_played = greatest(matches_played - 1, 0)
   where profile_id = v_hazar and category = w.category;

  -- Every notification about this match, whatever its category - Emre Y must
  -- not keep a "your ranking rose" card for a match he never played.
  delete from public.notifications
   where data->>'matchId' = w.id::text or data->>'match_id' = w.id::text;
  get diagnostics v_notes = row_count;

  delete from public.matches where id = w.id;

  update public.profiles p
     set last_match_at = (
       select max(m.played_at) from public.matches m
        where m.status = 'confirmed'
          and (p.user_id = any (m.team_a_player_ids) or p.user_id = any (m.team_b_player_ids)))
   where p.user_id in (v_wrong, v_hazar);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (null, 'admin_revert_match', 'matches', w.id,
          jsonb_build_object('reason', 'recorded against the wrong opponent',
                             'category', w.category,
                             'score', w.score_team_a || '-' || w.score_team_b,
                             'ratings_restored', jsonb_build_object(
                               'emre_y', v_wrong_after || '->' || v_wrong_before,
                               'hazar', v_hazar_after || '->' || v_hazar_before),
                             'notifications_deleted', v_notes));

  insert into _fix_report values
    (1, 'Yanlis mac silindi', w.id::text || ' (' || w.category || ')'),
    (2, 'Emre Y ' || w.category, v_wrong_after || ' -> ' || v_wrong_before),
    (3, 'Hazar ' || w.category, v_hazar_after || ' -> ' || v_hazar_before),
    (4, 'Silinen bildirim', v_notes::text);
end $$;

-- ---- Part 2: re-score the real match ---------------------------------------
do $$
declare
  c_hazar_email constant text := 'hazar.ustun@std.bogazici.edu.tr';
  v_hazar uuid;
  r public.matches;
  v_count int;
  v_opp uuid;
  v_opp_first text;
  v_opp_name text;
  v_a int;
  v_b int;
  v_url text;
  v_key text;
  v_req bigint;
begin
  select p.user_id into v_hazar
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_hazar_email);

  select count(*) into v_count
    from public.matches m
    join public.profiles o
      on o.user_id = case when m.team_a_player_ids[1] = v_hazar
                          then m.team_b_player_ids[1] else m.team_a_player_ids[1] end
   where m.format = 'pro_set_8' and m.status = 'voided'
     and cardinality(m.team_a_player_ids) = 1 and cardinality(m.team_b_player_ids) = 1
     and v_hazar in (m.team_a_player_ids[1], m.team_b_player_ids[1])
     and o.first_name ilike 'yunus%';
  if v_count <> 1 then
    insert into _fix_report values
      (10, 'GERCEK MAC BULUNAMADI', 'Yunus ile voided pro_set_8: ' || v_count || ' - skor yazilmadi');
    return;
  end if;

  select m.* into r
    from public.matches m
    join public.profiles o
      on o.user_id = case when m.team_a_player_ids[1] = v_hazar
                          then m.team_b_player_ids[1] else m.team_a_player_ids[1] end
   where m.format = 'pro_set_8' and m.status = 'voided'
     and cardinality(m.team_a_player_ids) = 1 and cardinality(m.team_b_player_ids) = 1
     and v_hazar in (m.team_a_player_ids[1], m.team_b_player_ids[1])
     and o.first_name ilike 'yunus%';

  v_opp := case when r.team_a_player_ids[1] = v_hazar
                then r.team_b_player_ids[1] else r.team_a_player_ids[1] end;
  select first_name, first_name || ' ' || last_name into v_opp_first, v_opp_name
    from public.profiles where user_id = v_opp;

  -- Yunus Emre won 8-4: the 8 goes to whichever side he is on in THIS row.
  if r.team_a_player_ids[1] = v_opp then v_a := 8; v_b := 4; else v_a := 4; v_b := 8; end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  select net.http_post(
    url     := v_url || '/admin-record-match',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('matchId', r.id, 'scoreTeamA', v_a, 'scoreTeamB', v_b,
                                  'note', 'Kortta 8-4 bitti; perspektif hatasi yuzunden voided kalmisti.')
  ) into v_req;

  insert into _fix_report values
    (10, 'Gercek mac skora gonderildi', r.id::text),
    (11, 'Rakip', v_opp_name),
    (12, 'Kategori / tarih', r.category || ' / ' || r.played_at::date),
    (13, 'Yazilacak skor (A-B)', v_a || '-' || v_b || '  (8 = ' || v_opp_first || ')'),
    (14, 'pg_net istek no', v_req::text),
    (15, 'ELO uygulanacak mi',
         case when r.kind = 'ranking' and r.is_rated then 'evet'
              else 'HAYIR - kind=' || r.kind || ' is_rated=' || r.is_rated end);
end $$;

select step, what, detail from _fix_report order by step;
