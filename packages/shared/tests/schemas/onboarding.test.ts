import { describe, expect, test } from 'bun:test';
import {
  onboardingSchema,
  validateBouniMail,
  ALLOWED_BOUN_DOMAINS,
} from '../../src/schemas/onboarding.js';

describe('BÜ email validation', () => {
  test('accepts @boun.edu.tr', () => {
    expect(validateBouniMail('ahmet.veli@boun.edu.tr')).toBe(true);
  });

  test('accepts @std.bogazici.edu.tr', () => {
    expect(validateBouniMail('ayse.fatma@std.bogazici.edu.tr')).toBe(true);
  });

  test('rejects gmail.com', () => {
    expect(validateBouniMail('user@gmail.com')).toBe(false);
  });

  test('rejects subdomain spoof', () => {
    expect(validateBouniMail('user@boun.edu.tr.fake.com')).toBe(false);
  });

  test('case insensitive', () => {
    expect(validateBouniMail('Foo@BOUN.EDU.TR')).toBe(true);
  });

  test('ALLOWED_BOUN_DOMAINS has 2 entries', () => {
    expect(ALLOWED_BOUN_DOMAINS).toEqual(['boun.edu.tr', 'std.bogazici.edu.tr']);
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
});
