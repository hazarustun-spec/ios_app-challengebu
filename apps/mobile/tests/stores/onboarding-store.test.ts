import { describe, expect, test, beforeEach } from 'bun:test';
import { useOnboardingStore } from '../../stores/onboarding-store';

describe('onboarding-store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  test('initial draft has defaults', () => {
    const d = useOnboardingStore.getState().draft;
    expect(d.firstName).toBe('');
    expect(d.showDepartment).toBe(true);
    expect(d.availabilityWindows).toEqual([]);
  });

  test('update patches draft', () => {
    useOnboardingStore.getState().update({ firstName: 'Ali', genderCategory: 'erkek' });
    const d = useOnboardingStore.getState().draft;
    expect(d.firstName).toBe('Ali');
    expect(d.genderCategory).toBe('erkek');
    expect(d.showDepartment).toBe(true);
  });

  test('reset returns to initial', () => {
    useOnboardingStore.getState().update({ firstName: 'X' });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().draft.firstName).toBe('');
  });
});
