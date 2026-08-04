// Whether a loaded profile row counts as "onboarded".
//
// Extracted from auth-bootstrap.ts so the rule is assertable under `bun test`
// — auth-bootstrap imports the Supabase client and cannot be loaded there.
//
// IMPORTANT: this module must stay free of runtime imports.
//
// Two subtleties the previous inline expression got wrong:
//
//  1. `profiles.status` is `not null default 'active'`
//     (20260606000001_profiles.sql:29), so the old `status !== null` guard was
//     dead code — it was true for every row that exists at all.
//
//  2. `anonymize-account` leaves a deleted account with a real-looking name
//     and `status = 'anonymized'`, which made the old rule report
//     "onboarded" for an account the user had just deleted. Signing back in
//     dropped them straight into the app on a tombstone profile instead of
//     re-running the wizard.
//
// Re-onboarding an anonymized profile is the intended recovery path: the
// client writes a real first_name and the
// `trg_reactivate_on_reonboarding` trigger
// (20260804000001_reactivate_on_reonboarding.sql) flips `status` back to
// 'active'. The client cannot set `status` itself — UPDATE on that column is
// revoked from `authenticated` (20260619000001_security_hardening.sql:18) —
// so without that trigger this predicate would never flip back and onboarding
// would loop forever.

export interface OnboardingStatusRow {
  first_name: string | null;
  status: string | null;
}

export function isOnboardingComplete(row: OnboardingStatusRow): boolean {
  if (row.status === 'anonymized') return false;
  return (row.first_name?.length ?? 0) > 0;
}
