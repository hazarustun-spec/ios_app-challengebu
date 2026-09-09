-- pgTAP tests for the format-aware live score engine
-- (20260909000001_live_score_units_by_format.sql).
--
-- The engine previously implemented BÜ Klasik only: every format accumulated
-- 15/30/40 rally points and ended at 4 games, so a Pro Set, a tiebreak and a
-- best-of-three all ran on the wrong rule. Each event is now one UNIT of the
-- match's own format, and these tests pin the four win conditions — especially
-- the deciders, which are the cases a "first to N" reading gets wrong.
--
-- Run: supabase test db tests/database/live-score-formats.test.sql
begin;
select plan(22);

-- ── Fixtures ────────────────────────────────────────────────────────────────
\set pa '10000000-0000-0000-0000-0000000000aa'
\set pb '10000000-0000-0000-0000-0000000000bb'

insert into auth.users (id) values (:'pa'), (:'pb');

insert into public.profiles
  (user_id, role, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'pa','player','Ali','A','lsa@test.local','he/him','erkek','1','orta','sag'),
  (:'pb','player','Bora','B','lsb@test.local','he/him','erkek','1','orta','sag');

\set m_klasik  '20000000-0000-0000-0000-000000000001'
\set m_klasik2 '20000000-0000-0000-0000-000000000002'
\set m_proset  '20000000-0000-0000-0000-000000000003'
\set m_proset2 '20000000-0000-0000-0000-000000000004'
\set m_tb      '20000000-0000-0000-0000-000000000005'
\set m_3set    '20000000-0000-0000-0000-000000000006'
\set m_revoke  '20000000-0000-0000-0000-000000000007'

insert into public.matches
  (id, category, format, court_id, played_at, team_a_player_ids, team_b_player_ids)
values
  (:'m_klasik','erkek_tek','bu_klasik',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_klasik2','erkek_tek','bu_klasik',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_proset','erkek_tek','pro_set_8',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_proset2','erkek_tek','pro_set_8',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_tb','erkek_tek','hizli_tiebreak',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_3set','erkek_tek','3set_klasik',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]),
  (:'m_revoke','erkek_tek','bu_klasik',(select id from public.courts limit 1),
   now(), array[:'pa']::uuid[], array[:'pb']::uuid[]);

-- Award n units to one side. Runs as player A throughout: the dedupe window in
-- award_unit only collapses consecutive same-side events from DIFFERENT actors,
-- so a single actor's run is never swallowed.
create function pg_temp.give(p_match uuid, p_side text, n int)
returns void language plpgsql as $$
begin
  for _ in 1..n loop
    perform public.award_unit(p_match, p_side);
  end loop;
end;
$$;

set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-0000000000aa"}';

-- ── BÜ Klasik — first to 4 games, seventh game decides ──────────────────────
select pg_temp.give(:'m_klasik', 'a', 3);
select pg_temp.give(:'m_klasik', 'b', 3);

select is(
  (select phase from public.live_match_scores where match_id = :'m_klasik'),
  'ongoing',
  'Klasik 3-3 is NOT a draw — a decider follows (the old engine voided here)');
select is(
  (select games_a || '-' || games_b from public.live_match_scores where match_id = :'m_klasik'),
  '3-3',
  'Klasik 3-3 counts three games each');

select pg_temp.give(:'m_klasik', 'b', 1);
select is(
  (select phase from public.live_match_scores where match_id = :'m_klasik'),
  'finished',
  'Klasik decider ends the match');
select is(
  (select winner from public.live_match_scores where match_id = :'m_klasik'),
  'b',
  'Klasik 3-4 → b wins');
select is(
  (select games_a || '-' || games_b from public.live_match_scores where match_id = :'m_klasik'),
  '3-4',
  'Klasik decider scores 4-3, the result the format-rules screen advertises');

-- A clean sweep still ends at four.
select pg_temp.give(:'m_klasik2', 'a', 4);
select is(
  (select phase || ':' || winner || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_klasik2'),
  'finished:a:4-0',
  'Klasik 4-0 ends immediately');

-- Events recorded after the end are ignored.
select pg_temp.give(:'m_klasik2', 'b', 3);
select is(
  (select games_b from public.live_match_scores where match_id = :'m_klasik2'),
  0,
  'units awarded after the match ended are ignored');

-- ── Pro Set 8 — eight games, two clear; 8-8 goes to 9-8 ────────────────────
select pg_temp.give(:'m_proset', 'a', 8);
select is(
  (select phase || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_proset'),
  'finished:8-0',
  'Pro Set 8-0 ends the match');

select pg_temp.give(:'m_proset2', 'a', 7);
select pg_temp.give(:'m_proset2', 'b', 7);
select pg_temp.give(:'m_proset2', 'a', 1);
select is(
  (select phase || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_proset2'),
  'ongoing:8-7',
  'Pro Set 8-7 plays on — reaching eight is not enough without two clear');

select pg_temp.give(:'m_proset2', 'b', 1);
select is(
  (select phase from public.live_match_scores where match_id = :'m_proset2'),
  'ongoing',
  'Pro Set 8-8 plays on');

select pg_temp.give(:'m_proset2', 'a', 1);
select is(
  (select phase || ':' || winner || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_proset2'),
  'finished:a:9-8',
  'Pro Set tiebreak ends 9-8 despite the one-game margin');

-- ── Hızlı Tiebreak — ten points, two clear, no ceiling ─────────────────────
select pg_temp.give(:'m_tb', 'a', 9);
select pg_temp.give(:'m_tb', 'b', 9);
select pg_temp.give(:'m_tb', 'a', 1);
select is(
  (select phase || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_tb'),
  'ongoing:10-9',
  'Tiebreak 10-9 plays on');

select pg_temp.give(:'m_tb', 'b', 1);
select pg_temp.give(:'m_tb', 'a', 2);
select is(
  (select phase || ':' || winner || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_tb'),
  'finished:a:12-10',
  'Tiebreak runs past ten until somebody is two clear');

-- ── 3 Set Klasik — the unit is a SET, first to two ─────────────────────────
select pg_temp.give(:'m_3set', 'a', 1);
select pg_temp.give(:'m_3set', 'b', 1);
select is(
  (select phase from public.live_match_scores where match_id = :'m_3set'),
  'ongoing',
  '3 Set 1-1 plays on');

select pg_temp.give(:'m_3set', 'a', 1);
select is(
  (select phase || ':' || winner || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_3set'),
  'finished:a:2-1',
  '3 Set ends 2-1 — two SETS, not two games');

-- ── revoke_unit takes back the caller's chosen side, not "the last one" ────
select pg_temp.give(:'m_revoke', 'a', 2);
select pg_temp.give(:'m_revoke', 'b', 1);

select public.revoke_unit(:'m_revoke', 'a');
select is(
  (select games_a || '-' || games_b from public.live_match_scores where match_id = :'m_revoke'),
  '1-1',
  'revoke_unit takes a unit off the side asked for, not the side that scored last');

select public.revoke_unit(:'m_revoke', 'b');
select is(
  (select games_a || '-' || games_b from public.live_match_scores where match_id = :'m_revoke'),
  '1-0',
  'revoke_unit works on the other side too');

select public.revoke_unit(:'m_revoke', 'b');
select is(
  (select games_a || '-' || games_b from public.live_match_scores where match_id = :'m_revoke'),
  '1-0',
  'revoking a side with nothing to take back is a no-op');

-- Taking back a match-winning unit reopens the match.
select pg_temp.give(:'m_revoke', 'a', 3);
select is(
  (select phase from public.live_match_scores where match_id = :'m_revoke'),
  'finished',
  'four games finishes the revoke fixture');
select public.revoke_unit(:'m_revoke', 'a');
select is(
  (select phase || ':' || coalesce(winner,'-') || ':' || games_a || '-' || games_b
     from public.live_match_scores where match_id = :'m_revoke'),
  'ongoing:-:3-0',
  'taking back the winning unit returns the match to ongoing');

-- ── Rally points are gone ──────────────────────────────────────────────────
select is(
  (select points_a + points_b from public.live_match_scores where match_id = :'m_klasik'),
  0,
  'points_a/points_b stay zero — the 15/30/40 ladder is not tracked any more');

-- ── Guards ────────────────────────────────────────────────────────────────
select throws_ok(
  format('select public.award_unit(%L, %L)', :'m_klasik', 'x'),
  '22023',
  null,
  'award_unit rejects a side that is not a or b');

set local request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000099"}';
select throws_ok(
  format('select public.award_unit(%L, %L)', :'m_klasik2', 'a'),
  '42501',
  null,
  'a non-participant cannot score somebody else''s match');
select throws_ok(
  format('select public.revoke_unit(%L, %L)', :'m_klasik2', 'a'),
  '42501',
  null,
  'a non-participant cannot take a unit back either');

select * from finish();
rollback;
