import { beforeEach, describe, expect, test } from 'bun:test';
import type { Session, User } from '@supabase/supabase-js';
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
    const fakeSession = {
      access_token: 'x',
      user: { id: 'u1', email: 'a@b.c' },
    } as unknown as Session;
    useAuthStore.getState().setSession(fakeSession);
    expect(useAuthStore.getState().session).toBe(fakeSession);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  test('signOut clears state', () => {
    useAuthStore.setState({
      session: { access_token: 'x' } as unknown as Session,
      user: { id: 'u1' } as unknown as User,
    });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
