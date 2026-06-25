# Server-Authoritative Live Score (Live Activities Phase 1-2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move in-progress match scoring to a server-authoritative `live_match_scores` row updated through an `award_point` RPC, and make `score.tsx` read/write it live — the single source of truth the lock-screen buttons + two-device sync (next plan) build on.

**Architecture:** A `live_match_scores` table holds the current games/points. An atomic `award_point(match_id, side)` Postgres RPC locks the row, applies the tennis logic, and returns the new state. `score.tsx` loads the row on open, subscribes to it via Supabase Realtime, and its "+" buttons call `award_point` instead of mutating local `useState`. Verifiable entirely on one device.

**Tech Stack:** Supabase (Postgres RPC + RLS + Realtime), Deno (not needed here — RPC is plpgsql), React Native, expo-router, @tanstack/react-query, @supabase/supabase-js.

## Global Constraints

- Score model (single set, first to **4 games**, margin ≥ 1, `3-3` → void; points 0–4 → `0/15/30/40/Ad`). The awarded side wins the game when its new points `>= 4` and lead `>= 1` and it is not `4-4` (then deuce → both back to `3`). This is the SYMMETRIC, correct version of `score.tsx`'s `winsGame` (the existing client checks side A's condition regardless of who scored — a bug that disappears once the server is authoritative).
- Brand: this is backend + an existing screen; no new UI design.
- Turkish copy uses correct dotted/dotless i.
- Production-ready; no temporary stubs. A failed Realtime/RPC must not corrupt the score (RPC is atomic; the screen falls back to the last loaded state).
- `live_match_scores` is the source of truth ONLY for an in-progress match; the final agreed score still flows through the existing `submit-match-score` / `confirm-match` consensus at match end (out of scope here).

---

### Task 1: `live_match_scores` table + `award_point` RPC + Realtime

**Files:**
- Create: `packages/supabase/migrations/20260626000001_live_match_scores.sql`

**Interfaces:**
- Produces:
  - table `public.live_match_scores(match_id uuid pk, games_a int, games_b int, points_a int, points_b int, phase text, winner text, version int, updated_at timestamptz)`
  - RPC `public.award_point(p_match_id uuid, p_side text) returns public.live_match_scores` — applies one point to side `'a'|'b'`, returns the new row. Creates the row at 0-0 if missing. Caller must be a match participant.
  - RPC `public.get_or_init_live_score(p_match_id uuid) returns public.live_match_scores` — returns the row, creating it at 0-0 if missing.

- [ ] **Step 1: Write the migration — table + RLS**

Create `packages/supabase/migrations/20260626000001_live_match_scores.sql`:
```sql
create table if not exists public.live_match_scores (
  match_id   uuid primary key references public.matches(id) on delete cascade,
  games_a    int  not null default 0,
  games_b    int  not null default 0,
  points_a   int  not null default 0,
  points_b   int  not null default 0,
  phase      text not null default 'ongoing',   -- ongoing | void | finished
  winner     text,                               -- 'a' | 'b' | null
  version    int  not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.live_match_scores enable row level security;

-- Participants of the match may read the live score.
create policy live_score_read on public.live_match_scores
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = live_match_scores.match_id
        and (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    )
  );
-- No direct client writes; only the SECURITY DEFINER RPC mutates rows.
```

- [ ] **Step 2: Add the scoring RPC**

Append to the same migration:
```sql
create or replace function public.award_point(p_match_id uuid, p_side text)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  is_participant boolean;
  na int; nb int;  -- new points a/b
  aw int; ot int;  -- awarded / other new points
begin
  if p_side not in ('a','b') then
    raise exception 'invalid side %', p_side using errcode = '22023';
  end if;

  select (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    into is_participant
    from public.matches m where m.id = p_match_id;
  if not coalesce(is_participant, false) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  -- Lock (or create) the row.
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id for update;

  if r.phase <> 'ongoing' then
    return r;  -- finished/void: ignore further points
  end if;

  na := r.points_a; nb := r.points_b;
  if p_side = 'a' then na := na + 1; else nb := nb + 1; end if;
  if p_side = 'a' then aw := na; ot := nb; else aw := nb; ot := na; end if;

  if aw >= 4 and (aw - ot) >= 1 and not (aw = 4 and ot = 4) then
    -- awarded side wins the game
    if p_side = 'a' then r.games_a := r.games_a + 1; else r.games_b := r.games_b + 1; end if;
    r.points_a := 0; r.points_b := 0;
  elsif aw = 4 and ot = 4 then
    r.points_a := 3; r.points_b := 3;  -- deuce
  else
    r.points_a := na; r.points_b := nb;
  end if;

  -- Set / game outcome
  if r.games_a = 4 or r.games_b = 4 then
    r.phase := 'finished';
    r.winner := case when r.games_a = 4 then 'a' else 'b' end;
  elsif r.games_a = 3 and r.games_b = 3 then
    r.phase := 'void';
  end if;

  r.version := r.version + 1;
  r.updated_at := now();
  update public.live_match_scores set
    games_a = r.games_a, games_b = r.games_b, points_a = r.points_a, points_b = r.points_b,
    phase = r.phase, winner = r.winner, version = r.version, updated_at = r.updated_at
  where match_id = p_match_id;
  return r;
end;
$$;

create or replace function public.get_or_init_live_score(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare r public.live_match_scores;
begin
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id;
  return r;
end;
$$;

revoke execute on function public.award_point(uuid, text) from anon;
revoke execute on function public.get_or_init_live_score(uuid) from anon;

-- Realtime: broadcast row changes to subscribed participants.
alter publication supabase_realtime add table public.live_match_scores;
```

- [ ] **Step 3: Push the migration to the cloud**

Run from `packages/supabase`:
```bash
export SUPABASE_DB_PASSWORD="<db password>"
echo "y" | supabase db push
```
Expected: `Applying migration 20260626000001_live_match_scores.sql...` then `Finished supabase db push.`

- [ ] **Step 4: Verify the scoring logic with SQL (the test)**

Using the cloud connection (read-write here is intentional, on a throwaway match id you insert + delete), run a sequence proving point→game→set. Pick a real participant match id, or temporarily insert a matches row. Run via psql:
```sql
-- reset
delete from public.live_match_scores where match_id = '<MID>';
-- 4 points to A → A should win game 1 (games_a=1, points reset)
select games_a, games_b, points_a, points_b, phase from public.award_point('<MID>','a');
select * from public.award_point('<MID>','a');
select * from public.award_point('<MID>','a');
select games_a, points_a, points_b from public.award_point('<MID>','a');
-- expect: games_a=1, points_a=0, points_b=0
-- give B four points across a game similarly and confirm games_b increments
-- drive to 3-3 games then one more game → phase='void' OR to 4 games → phase='finished', winner set
```
Expected: A reaching 4 points increments `games_a` and resets points; B scoring increments `games_b` (proving the symmetric fix); reaching 4 games sets `phase='finished'` + `winner`; 3-3 games sets `phase='void'`.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260626000001_live_match_scores.sql
git commit -m "feat(live-score): live_match_scores table + atomic award_point RPC + Realtime"
```

---

### Task 2: `score.tsx` reads/writes the server live score

**Files:**
- Create: `apps/mobile/hooks/use-live-score.ts`
- Modify: `apps/mobile/app/match/[id]/score.tsx`

**Interfaces:**
- Consumes: `award_point` + `get_or_init_live_score` RPCs (Task 1).
- Produces: hook `useLiveScore(matchId)` → `{ score: LiveScore | null, awardPoint(side: 'a'|'b'): Promise<void> }` where `LiveScore = { gamesA; gamesB; pointsA; pointsB; phase: 'ongoing'|'void'|'finished'; winner: 'a'|'b'|null }`.

- [ ] **Step 1: Write the hook**

Create `apps/mobile/hooks/use-live-score.ts`:
```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type LiveScore = {
  gamesA: number; gamesB: number; pointsA: number; pointsB: number;
  phase: 'ongoing' | 'void' | 'finished'; winner: 'a' | 'b' | null;
};

function fromRow(r: Record<string, unknown>): LiveScore {
  return {
    gamesA: Number(r.games_a ?? 0), gamesB: Number(r.games_b ?? 0),
    pointsA: Number(r.points_a ?? 0), pointsB: Number(r.points_b ?? 0),
    phase: (r.phase as LiveScore['phase']) ?? 'ongoing',
    winner: (r.winner as LiveScore['winner']) ?? null,
  };
}

export function useLiveScore(matchId: string | undefined) {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    // Initial load — shows lock-screen changes made while the app was closed.
    supabase.rpc('get_or_init_live_score', { p_match_id: matchId }).then(({ data }) => {
      if (active && data) setScore(fromRow(data as Record<string, unknown>));
    });
    const channel = supabase
      .channel(`live_score_${matchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_match_scores', filter: `match_id=eq.${matchId}` },
        (payload) => { if (active && payload.new) setScore(fromRow(payload.new as Record<string, unknown>)); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [matchId]);

  const awardPoint = useCallback(async (side: 'a' | 'b') => {
    if (!matchId) return;
    const { data } = await supabase.rpc('award_point', { p_match_id: matchId, p_side: side });
    if (data) setScore(fromRow(data as Record<string, unknown>)); // optimistic; Realtime confirms
  }, [matchId]);

  return { score, awardPoint };
}
```
> Verify the supabase client import path (`../lib/supabase`) during implementation; match what other hooks use.

- [ ] **Step 2: Replace local scoring in `score.tsx`**

In `apps/mobile/app/match/[id]/score.tsx`, remove the local `gA/gB/pA/pB` `useState` + `award` + `hist`/`undo` reducer, and drive everything from the hook. Wire it as:
```ts
import { useLiveScore } from '../../../hooks/use-live-score';
// inside the component:
const { score, awardPoint } = useLiveScore(id);
const gA = score?.gamesA ?? 0, gB = score?.gamesB ?? 0;
const pA = score?.pointsA ?? 0, pB = score?.pointsB ?? 0;
const isVoid = score?.phase === 'void';
const someoneWon = score?.phase === 'finished';
```
Change the two "+" award buttons to call `awardPoint('a')` / `awardPoint('b')` (replacing the old `award('A')`/`award('B')`). Keep the existing Live Activity effects (Plan 1) — they already read `gA/gB/pA/pB`, now sourced from the server. Remove the now-unused Undo button (server is authoritative; undo would need a server op — out of scope, note it).

- [ ] **Step 3: Typecheck**

Run from `apps/mobile`:
```bash
npx tsc --noEmit
```
Expected: no errors in `score.tsx` / `use-live-score.ts`.

- [ ] **Step 4: Rebuild + verify on device (runtime)**

Run from `apps/mobile`:
```bash
rm -rf ios/TennisChallenger.xcworkspace 2>/dev/null
npx expo run:ios --device "Hazar U." --configuration Release
```
On the phone: enter a match's live score screen → tap "+" for each side → games/points advance per the rules; reaching 4 points wins a game for the correct side (B too); the Live Activity (Plan 1) still mirrors the score on the Lock Screen. Reopen the app on the same match → the score persists (loaded from the server). Capture a screenshot.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/use-live-score.ts apps/mobile/app/match/\[id\]/score.tsx
git commit -m "feat(live-score): score.tsx is server-driven (award_point + Realtime + load on open)"
```

---

## Next Plan (not in scope here)

**Live Activities Phase 3-5** (`2026-06-26-live-activities-interactive-sync.md`): direct APNs (ES256 JWT + `.p8` in Vault, `apns-push-type: liveactivity`), `live_activity_tokens` + `register-activity-token`, push the new `live_match_scores` state to both activities, the `AwardPointIntent` (App Intent) lock-screen buttons calling `award_point` (with auth via App Group/Keychain), and push-to-start. This plan's `award_point` RPC is exactly what those buttons + the push relay call.
