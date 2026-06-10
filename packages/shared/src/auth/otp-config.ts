/**
 * OTP / Magic-link auth configuration helpers for Plan 8 sign-in flow.
 *
 * The mobile sign-in screen calls:
 *   supabase.auth.signInWithOtp({ email, options: getOtpOptions({ email, withMagicLink: true }) })
 *
 * Backend config (one-time, manual via Supabase Studio dashboard):
 *   See docs/superpowers/specs/plan-8-design-bundle/SUPABASE_OTP_SETUP.md
 *
 * Enabling both OTP and Magic Link in the email template means a single mail
 * delivers a 6-digit code AND a clickable link — user picks the more convenient
 * path on their device (iOS Mail one-time-code AutoFill for the code, OR tap
 * the deep link). Plan 8 OTP screen supports both.
 */

export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_SEC = 60;

export interface SendOtpInput {
  /** User's BÜ e-posta. Validated against the 5 accepted domains client-side before calling this. */
  email: string;
  /** Include emailRedirectTo so the mail also carries a magic-link deep link. */
  withMagicLink?: boolean;
}

export interface OtpOptions {
  /** Allow new users to be created on first sign-in (no separate sign-up screen). */
  shouldCreateUser: boolean;
  /** Deep link for the magic-link path. iOS app handles tenniskampus:// scheme. */
  emailRedirectTo?: string;
}

/**
 * Build the `options` payload for `supabase.auth.signInWithOtp`.
 *
 * Returns a shouldCreateUser-true config so the BÜ-email-gated app can do
 * sign-up + sign-in in a single screen (no separate "create account" flow).
 * Optionally embeds the magic-link redirect for clients that prefer the link.
 */
export function getOtpOptions(input: SendOtpInput): OtpOptions {
  return {
    shouldCreateUser: true,
    ...(input.withMagicLink ? { emailRedirectTo: 'tenniskampus://auth/callback' } : {}),
  };
}
