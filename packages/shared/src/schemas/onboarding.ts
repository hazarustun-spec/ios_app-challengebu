import { z } from 'zod';

export const ALLOWED_BOUN_DOMAINS = [
  'std.bogazici.edu.tr',
  'bogazici.edu.tr',
  'pt.bogazici.edu.tr',
  'retired.bogazici.edu.tr',
  'alumni.bogazici.edu.tr',
] as const;

export const BOUN_EMAIL_ERROR_TR =
  'Sadece BÜ e-postası kabul edilir (@std.bogazici.edu.tr, @bogazici.edu.tr, @pt.bogazici.edu.tr, @retired.bogazici.edu.tr veya @alumni.bogazici.edu.tr)';

export function validateBouniMail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return ALLOWED_BOUN_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
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
  })
  .refine(
    (data) => {
      if (data.pronoun === 'other') {
        return data.pronounCustom !== undefined && data.pronounCustom.length > 0;
      }
      return true;
    },
    { message: 'pronounCustom is required when pronoun is "other"', path: ['pronounCustom'] },
  );

export type OnboardingInput = z.infer<typeof onboardingSchema>;
