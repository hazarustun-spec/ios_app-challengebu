import { describe, expect, test, mock } from 'bun:test';
import { EdgeFunctionError } from '../../lib/invoke-function';

describe('invoke-function', () => {
  test('EdgeFunctionError carries status and parsed error body', () => {
    const e = new EdgeFunctionError('Conflict', 409, { detail: 'limit reached' });
    expect(e.status).toBe(409);
    expect(e.message).toBe('Conflict');
    expect(e.details).toEqual({ detail: 'limit reached' });
  });

  test('invokeFunction throws on non-2xx', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key-aaaaaaaaaaaaaaaaaaaaa';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(
      JSON.stringify({ error: { message: 'Forbidden' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

    const { invokeFunction } = await import('../../lib/invoke-function');
    let caught: unknown;
    try {
      await invokeFunction('test-fn', { foo: 'bar' }, 'fake-token');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EdgeFunctionError);
    expect((caught as EdgeFunctionError).status).toBe(403);
    expect((caught as EdgeFunctionError).message).toBe('Forbidden');

    globalThis.fetch = originalFetch;
  });

  test('invokeFunction returns parsed JSON on 2xx', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key-aaaaaaaaaaaaaaaaaaaaa';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(
      JSON.stringify({ id: 'req-1', status: 'pending' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

    const { invokeFunction } = await import('../../lib/invoke-function');
    const result = await invokeFunction<{ id: string; status: string }>('test-fn', {}, 'token');
    expect(result.id).toBe('req-1');
    expect(result.status).toBe('pending');

    globalThis.fetch = originalFetch;
  });
});
