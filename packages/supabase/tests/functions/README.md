# Edge-function tests (Deno)

Run the full suite from `packages/supabase`:

```sh
INTERNAL_PUSH_KEY=test-internal-key deno test --config functions/deno.json \
  --allow-net --allow-env --allow-read 'tests/functions/*.deno-test.ts'
```

The local Supabase stack must be running (`supabase start`). Some tests need the
functions served with the env file (`supabase functions serve --env-file
functions/.env.test`); those self-skip via a `KEY_HONORED` probe when it isn't.

## Known: occasional full-suite flake (shared local stack)

Every test runs against the **same** local Postgres + edge runtime, so a handful
of tests that assert on **global state** (Vault secrets, total live-activity
token counts, "pushed: N" results) can occasionally see another test's rows or
cleanup mid-run. Symptom: 2–3 of ~163 tests fail on one run and pass on the next,
with no code change.

- **This is a test-infrastructure artifact, not an app bug.** Each affected test
  passes in isolation; the functions themselves are correct.
- Most tests were made self-isolated (unique-id seed + scoped, FK-safe teardown,
  no global `cleanupTestData`) which made clean full-suite runs common. The
  residual flake comes from the few global-state assertions above.
- If a run fails, **re-run it**, or run the suspect file alone:
  `deno test ... tests/functions/<file>.deno-test.ts`.

A full fix would need per-test DB isolation (separate schema/transaction per
test) or serialized execution — deferred; not worth it for users (these tests
never run in production).
