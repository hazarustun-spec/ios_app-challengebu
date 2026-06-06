import { describe, expect, test, beforeEach } from 'bun:test';
import { useAuthStore } from '../../stores/auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, user: null, profile: null, loading: true });
  });

  test('initial state', () => {
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().loading).toBe(true);
  });

  test('setSession updates session and user', () => {
    const fakeSession = { access_token: 'x', user: { id: 'u1', email: 'a@b.c' } } as any;
    useAuthStore.getState().setSession(fakeSession);
    expect(useAuthStore.getState().session).toBe(fakeSession);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  test('signOut clears state', () => {
    useAuthStore.setState({ session: { access_token: 'x' } as any, user: { id: 'u1' } as any });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
