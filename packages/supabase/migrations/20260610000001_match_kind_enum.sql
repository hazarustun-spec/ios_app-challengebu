-- Plan 8 Task A1 — match_kind enum + ELO guard.
--
-- Adds a `kind` enum to `matches` so the UI can mark a match as a "Dostluk
-- Maçı" (friendly) that does NOT affect ELO or ladder ranking. The default is
-- 'ranking' so all existing rows and any client that omits the field continue
-- to behave like a normal competitive (rated) match.
--
-- ELO application lives in the Edge Function `_shared/apply-elo.ts`
-- (called from `confirm-match` and `resolve-dispute`), not in a DB trigger.
-- The actual guard (`if match.kind !== 'ranking' → return`) is added there in
-- the same change set; this migration only owns the schema surface.

create type match_kind as enum ('ranking', 'friendly');

alter table public.matches
  add column kind match_kind not null default 'ranking';

comment on column public.matches.kind is
  'ranking = ELO ve ladder etkilenir; friendly = sadece W/L stats.';

create index matches_kind_idx on public.matches (kind);
