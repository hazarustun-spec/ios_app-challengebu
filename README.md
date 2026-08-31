# ChallengeBu!

A tennis ladder for a campus. Challenge someone, play a ranked match, climb on your ELO. Seasons end in an eight-player bracket, and a match in progress shows its score on the lock screen. Singles, doubles, open and friendly. Currently Boğaziçi only.

**564 commits · Expo · Supabase · Turborepo · Bun · TypeScript**

The app, the marketing site and the packages they share live in one repository.

## Why a monorepo

The app and the site describe the same thing to two audiences. In separate repositories that means two copies of every shared type and two chances for them to disagree. Everything shared sits in `packages/` and both surfaces import it, so a rating rule changes in one place.

```
apps/mobile          the Expo app
website              the marketing site
packages/shared      types and logic both surfaces use
packages/supabase    migrations, edge functions, their tests
qa                   end-to-end flows
docs                 plans and decisions
.github/workflows    CI
```

## Quality gates

The end-to-end flows drive the real app against a real local Supabase, not a mock, and they run in GitHub Actions rather than on my machine — so a broken flow blocks the branch instead of surfacing after release.

Every one of the 32 tables ships with row level security enabled in the same migration that creates it. The rule is that a table is not finished until its policies are written, which is why the anon key can live in the client at all.

Scheduled work — expiring stale challenges, auto-confirming scores, rolling a season over — runs as `pg_cron` jobs defined in migrations, so the schedule is versioned with the schema instead of living in a dashboard someone has to remember to reproduce.

## How changes are staged

Numbered plan branches. The plan goes into `docs/` first, a branch implements it, and the branch name points back at the plan — `plan-8-ui-redesign` is the current interface rework. It keeps a solo project honest about what it set out to do before it started typing.

## Working on it

```bash
bun install
bun run dev
```

Biome handles formatting and linting; Turbo caches builds across the workspaces.

## Elsewhere

Privacy, terms and the product page are published at [shimal.app/challengebu](https://shimal.app/challengebu/), independent of any app deploy, because App Store review needs them reachable at a stable URL.

---

Built by [Hazar Üstün](https://github.com/hazarustun-spec) · hazarustun@gmail.com
