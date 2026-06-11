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
    expect(s.pronoun).toBe('they/them');
    expect(s.category).toBe('erkek');
    expect(s.level).toBe('orta');
    expect(s.hand).toBe('sag');
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
