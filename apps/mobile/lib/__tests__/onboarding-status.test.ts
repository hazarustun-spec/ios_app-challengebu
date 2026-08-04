import { describe, expect, test } from 'bun:test';
import { isOnboardingComplete } from '../onboarding-status';

describe('isOnboardingComplete', () => {
  test('a normal onboarded profile is complete', () => {
    expect(isOnboardingComplete({ first_name: 'Hazar', status: 'active' })).toBe(true);
  });

  test('a fresh profile with no name is not complete', () => {
    expect(isOnboardingComplete({ first_name: '', status: 'active' })).toBe(false);
  });

  test('a null name is not complete', () => {
    expect(isOnboardingComplete({ first_name: null, status: 'active' })).toBe(false);
  });

  // The regression this module exists for: anonymize-account writes a
  // real-looking name, so the name check alone reported "onboarded" for an
  // account the user had just deleted.
  test('a deleted (anonymized) account is NOT complete despite having a name', () => {
    expect(isOnboardingComplete({ first_name: 'Silinmiş', status: 'anonymized' })).toBe(false);
  });

  test('re-onboarding flips back to complete once status is reactivated', () => {
    expect(isOnboardingComplete({ first_name: 'Hazar', status: 'anonymized' })).toBe(false);
    expect(isOnboardingComplete({ first_name: 'Hazar', status: 'active' })).toBe(true);
  });

  // Lifecycle states the cron assigns (20260607000003) are still onboarded —
  // only 'anonymized' is a tombstone.
  test('inactivity lifecycle states stay complete', () => {
    for (const status of ['frozen_30', 'hibernating_60', 'inactive_90']) {
      expect(isOnboardingComplete({ first_name: 'Hazar', status })).toBe(true);
    }
  });

  // Moderation states (20260609000006) are a separate concern — they gate
  // actions, not the wizard. A banned user must not be sent back through
  // onboarding.
  test('moderation states stay complete', () => {
    for (const status of ['suspended', 'banned']) {
      expect(isOnboardingComplete({ first_name: 'Hazar', status })).toBe(true);
    }
  });
});
