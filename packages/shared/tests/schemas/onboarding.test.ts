import { describe, expect, test } from 'bun:test';
import {
  ALLOWED_BOUN_DOMAINS,
  isReviewEmail,
  onboardingSchema,
  validateBouniMail,
} from '../../src/schemas/onboarding.js';

describe('BÜ email validation', () => {
  test('accepts @std.bogazici.edu.tr (students)', () => {
    expect(validateBouniMail('ayse.fatma@std.bogazici.edu.tr')).toBe(true);
  });

  test('accepts @bogazici.edu.tr (faculty/staff)', () => {
    expect(validateBouniMail('prof@bogazici.edu.tr')).toBe(true);
  });

  test('accepts @pt.bogazici.edu.tr (part-time)', () => {
    expect(validateBouniMail('pt@pt.bogazici.edu.tr')).toBe(true);
  });

  test('accepts @retired.bogazici.edu.tr (retired)', () => {
    expect(validateBouniMail('retired@retired.bogazici.edu.tr')).toBe(true);
  });

  test('accepts @alumni.bogazici.edu.tr (alumni)', () => {
    expect(validateBouniMail('alum@alumni.bogazici.edu.tr')).toBe(true);
  });

  test('rejects @boun.edu.tr (deprecated)', () => {
    expect(validateBouniMail('ahmet.veli@boun.edu.tr')).toBe(false);
  });

  test('rejects gmail.com', () => {
    expect(validateBouniMail('user@gmail.com')).toBe(false);
  });

  test('rejects subdomain spoof', () => {
    expect(validateBouniMail('user@bogazici.edu.tr.fake.com')).toBe(false);
  });

  test('case insensitive', () => {
    expect(validateBouniMail('Foo@STD.BOGAZICI.EDU.TR')).toBe(true);
  });

  test('isReviewEmail matches the App Store review mailbox', () => {
    expect(isReviewEmail('appreview42@proton.me')).toBe(true);
  });

  test('isReviewEmail is case-insensitive and trims', () => {
    expect(isReviewEmail('  APPREVIEW42@Proton.Me  ')).toBe(true);
  });

  test('isReviewEmail is false for a normal BÜ email', () => {
    expect(isReviewEmail('ayse.fatma@std.bogazici.edu.tr')).toBe(false);
  });

  test('ALLOWED_BOUN_DOMAINS has 5 entries', () => {
    expect(ALLOWED_BOUN_DOMAINS).toEqual([
      'std.bogazici.edu.tr',
      'bogazici.edu.tr',
      'pt.bogazici.edu.tr',
      'retired.bogazici.edu.tr',
      'alumni.bogazici.edu.tr',
    ]);
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

  test('rejects pronoun=other without custom text', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
    });
    expect(result.success).toBe(false);
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
