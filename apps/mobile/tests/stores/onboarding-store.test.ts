import { describe, expect, test, beforeEach } from 'bun:test';
import { useOnboardingStore } from '../../stores/onboarding-store';

describe('onboarding-store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  test('initial state has defaults', () => {
    const s = useOnboardingStore.getState();
    expect(s.firstName).toBe('');
    expect(s.showDepartment).toBe(true);
    expect(s.showClassYear).toBe(true);
    expect(s.availability).toEqual([]);
    // These four start unset so the user must make an explicit choice.
    expect(s.pronoun).toBeNull();
    expect(s.category).toBeNull();
    expect(s.level).toBeNull();
    expect(s.hand).toBeNull();
  });

  test('setField patches a single field', () => {
    useOnboardingStore.getState().setField('firstName', 'Ali');
    useOnboardingStore.getState().setField('category', 'kadin');
    const s = useOnboardingStore.getState();
    expect(s.firstName).toBe('Ali');
    expect(s.category).toBe('kadin');
    expect(s.showDepartment).toBe(true);
  });

  test('reset returns to initial', () => {
    useOnboardingStore.getState().setField('firstName', 'X');
    useOnboardingStore.getState().setField('availability', ['wd_am']);
    useOnboardingStore.getState().reset();
    const s = useOnboardingStore.getState();
    expect(s.firstName).toBe('');
    expect(s.availability).toEqual([]);
  });
});
