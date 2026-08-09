import { z } from 'zod';

export const ALLOWED_BOUN_DOMAINS = [
  'std.bogazici.edu.tr',
  'bogazici.edu.tr',
  'pt.bogazici.edu.tr',
  'retired.bogazici.edu.tr',
  'alumni.bogazici.edu.tr',
] as const;

// Shown when the address is outside ALLOWED_BOUN_DOMAINS. Worded as the
// membership rule it is, not as a failure: ChallengeBu! is a closed Boğaziçi
// ladder, so an address from anywhere else is not a mistake the person can
// correct by retyping, and red "error" styling only makes it read like the app
// broke.
export const BOUN_EMAIL_ERROR_TR =
  'ChallengeBu! yalnızca Boğaziçi Üniversitesi üyelerine açık. Öğrenci, akademisyen, emekli veya mezun e-postanı kullan.';

// App Store review account: the reviewer can't access a Boğaziçi inbox, so this
// single dedicated mailbox (a real inbox we control, for retrieving the OTP) is
// allowed through. It is NOT a Boğaziçi domain — only this exact address passes.
export const REVIEW_EMAILS: readonly string[] = ['appreview42@proton.me'];

// Mirror of the REVIEW_OTP_CODE secret the review-login Edge Function checks.
// Keeping it in the client lets the demo account sign in from the e-mail screen
// alone: no code to copy out of the review notes, no OTP screen, no keyboard —
// the three things that can go wrong on a reviewer's device but never on ours.
// The address it unlocks already ships in this bundle and belongs to an ordinary
// player with no elevated rights, so a leaked code buys nothing but that one
// demo profile. Rotate the secret (and this constant) after launch.
export const REVIEW_FIXED_CODE = '424242';

export function validateBouniMail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (REVIEW_EMAILS.includes(lower)) return true;
  return ALLOWED_BOUN_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
}

/**
 * True only for the dedicated App Store review mailbox. The sign-in/OTP screens
 * use this to route through the fixed-code review-login Edge Function instead of
 * the normal email-OTP flow (the reviewer can't read the mailbox).
 */
export function isReviewEmail(email: string): boolean {
  return REVIEW_EMAILS.includes(email.toLowerCase().trim());
}

export const PRONOUN_VALUES = ['he/him', 'she/her', 'they/them', 'other'] as const;
export const GENDER_CATEGORY_VALUES = ['erkek', 'kadin', 'open_only'] as const;
export const CLASS_YEAR_VALUES = ['hazirlik', '1', '2', '3', '4', 'yl', 'doktora'] as const;
export const SKILL_VALUES = ['baslangic', 'orta', 'ileri'] as const;
export const HAND_VALUES = ['sag', 'sol'] as const;
export const AVAILABILITY_VALUES = [
  'weekday_morning',
  'weekday_noon',
  'weekday_evening',
  'weekend_morning',
  'weekend_noon',
  'weekend_evening',
] as const;

const phoneSchema = z
  .string()
  .regex(/^\+\d{10,15}$/, 'Phone must be E.164 format (e.g. +905551234567)')
  .optional();

export const onboardingSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    phone: phoneSchema,
    pronoun: z.enum(PRONOUN_VALUES),
    pronounCustom: z.string().trim().min(1).max(30).optional(),
    genderCategory: z.enum(GENDER_CATEGORY_VALUES),
    departmentId: z.string().uuid(),
    classYear: z.enum(CLASS_YEAR_VALUES),
    skillSelfAssessment: z.enum(SKILL_VALUES),
    dominantHand: z.enum(HAND_VALUES),
    availabilityWindows: z.array(z.enum(AVAILABILITY_VALUES)).min(1),
    showDepartment: z.boolean(),
    showClassYear: z.boolean(),
  });
// pronounCustom stays optional for 'other'. The wizard labels that option
// "Diğer / belirtmek istemiyorum" and offers no text field, so requiring a
// value describes a screen that does not exist — the same mismatch the DB
// constraint pronoun_custom_when_other encoded until 20260809000002 dropped it.

export type OnboardingInput = z.infer<typeof onboardingSchema>;
