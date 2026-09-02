import { describe, expect, test } from 'bun:test';
import {
  isReviewEmail,
  onboardingSchema,
  validateUniversityEmail,
} from '../../src/schemas/onboarding.js';

describe('university email validation (.edu.tr gate)', () => {
  test('accepts a plain .edu.tr address', () => {
    expect(validateUniversityEmail('someone@example.edu.tr')).toBe(true);
  });

  test('accepts a subdomain under .edu.tr', () => {
    expect(validateUniversityEmail('alum@alumni.example.edu.tr')).toBe(true);
  });

  test('accepts case-insensitively', () => {
    expect(validateUniversityEmail('Foo@EXAMPLE.EDU.TR')).toBe(true);
  });

  test('rejects a generic consumer address', () => {
    expect(validateUniversityEmail('user@gmail.com')).toBe(false);
  });

  test('rejects a lookalike that appends more after .edu.tr', () => {
    expect(validateUniversityEmail('user@example.edu.tr.fake.com')).toBe(false);
  });

  test('rejects .edu without .tr', () => {
    expect(validateUniversityEmail('user@example.edu')).toBe(false);
  });

  test('isReviewEmail matches the App Store review mailbox', () => {
    expect(isReviewEmail('appreview42@proton.me')).toBe(true);
  });

  test('isReviewEmail is case-insensitive and trims', () => {
    expect(isReviewEmail('  APPREVIEW42@Proton.Me  ')).toBe(true);
  });

  test('isReviewEmail is false for a normal university address', () => {
    expect(isReviewEmail('someone@example.edu.tr')).toBe(false);
  });

  test('review mailbox passes the university-email gate as well', () => {
    expect(validateUniversityEmail('appreview42@proton.me')).toBe(true);
  });
});

describe('onboardingSchema', () => {
  const validInput = {
    firstName: 'Ali',
    lastName: 'Yılmaz',
    phone: '+905551234567',
    pronoun: 'he/him',
    genderCategory: 'erkek',
    departmentId: '00000000-0000-0000-0000-000000000001',
    classYear: '3',
    skillSelfAssessment: 'orta',
    dominantHand: 'sag',
    availabilityWindows: ['weekday_evening', 'weekend_morning'],
    showDepartment: true,
    showClassYear: true,
  };

  test('accepts valid input', () => {
    const result = onboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test('phone is optional', () => {
    const { phone: _phone, ...rest } = validInput;
    const result = onboardingSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  test('rejects empty firstName', () => {
    const result = onboardingSchema.safeParse({ ...validInput, firstName: '' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid pronoun', () => {
    const result = onboardingSchema.safeParse({ ...validInput, pronoun: 'xxx' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid classYear', () => {
    const result = onboardingSchema.safeParse({ ...validInput, classYear: '99' });
    expect(result.success).toBe(false);
  });

  test('rejects empty availabilityWindows', () => {
    const result = onboardingSchema.safeParse({ ...validInput, availabilityWindows: [] });
    expect(result.success).toBe(false);
  });

  test('rejects invalid phone format', () => {
    const result = onboardingSchema.safeParse({ ...validInput, phone: '5551234567' });
    expect(result.success).toBe(false);
  });

  test('accepts pronoun=other with custom text', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
      pronounCustom: 'ze/zir',
    });
    expect(result.success).toBe(true);
  });

  test('accepts pronoun=other without custom text (prefer-not-to-say path)', () => {
    // The wizard labels "other" as "Diğer / belirtmek istemiyorum" and offers
    // no follow-up text field; pronounCustom stays optional so this path can
    // finish sign-up. Guards fix(onboarding): let "prefer not to say" finish
    // sign-up (commit 9a2d2f0) from silently regressing.
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
    });
    expect(result.success).toBe(true);
  });

  test('rejects whitespace-only firstName', () => {
    const result = onboardingSchema.safeParse({ ...validInput, firstName: '   ' });
    expect(result.success).toBe(false);
  });

  test('rejects whitespace-only lastName', () => {
    const result = onboardingSchema.safeParse({ ...validInput, lastName: '   ' });
    expect(result.success).toBe(false);
  });

  test('rejects whitespace-only pronounCustom with pronoun=other', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
      pronounCustom: '   ',
    });
    expect(result.success).toBe(false);
  });

  test('rejects pronounCustom longer than 30 chars', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
      pronounCustom: 'a'.repeat(31),
    });
    expect(result.success).toBe(false);
  });
});
