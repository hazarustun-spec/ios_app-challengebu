-- A dispute can now say what the score SHOULD have been, and can be raised
-- before any score exists.
--
-- Two problems, reported from the field on the same match:
--
--   1. `raise-dispute` refused with "Scores must be submitted before a dispute
--      can be raised" — but the reason the player was reporting the match was
--      that the score screen was broken and they COULD NOT enter one. The
--      report button was gated on the very thing it was there to report.
--
--   2. When a score does exist, "this score is wrong" is only half a report.
--      An admin then has to message both players to find out what the real
--      score was. Asking for it at the moment of the complaint costs the
--      reporter one line and saves that round trip.
--
-- Both claimed values are nullable and only meaningful together: a dispute
-- raised because the match never happened has no score to claim.
alter table public.disputes
  add column if not exists claimed_score_a int,
  add column if not exists claimed_score_b int;

comment on column public.disputes.claimed_score_a is
  'Score the reporter says team A actually got, in the format''s own unit. Null when they did not claim one.';
comment on column public.disputes.claimed_score_b is
  'Score the reporter says team B actually got. Null when they did not claim one.';

alter table public.disputes
  drop constraint if exists disputes_claimed_score_pair;
alter table public.disputes
  add constraint disputes_claimed_score_pair check (
    (claimed_score_a is null) = (claimed_score_b is null)
    and (claimed_score_a is null or (claimed_score_a >= 0 and claimed_score_b >= 0))
  );
