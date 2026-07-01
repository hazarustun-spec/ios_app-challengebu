import { env } from './env';

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export async function invokeFunction<TResponse = unknown>(
  name: string,
  body: unknown,
  // Optional: unauthenticated endpoints (e.g. review-login, called before the
  // user has a session) omit the Authorization header. The anon apikey below is
  // always sent so the gateway still accepts the call.
  accessToken?: string,
): Promise<TResponse> {
  const res = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') ?? '';
  const parsed = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();

  if (!res.ok) {
    const errorMsg = typeof parsed === 'object' && parsed && 'error' in parsed
      ? (parsed as { error: { message: string } }).error?.message ?? 'Request failed'
      : `Request failed: ${res.status}`;
    const details = typeof parsed === 'object' && parsed && 'error' in parsed
      ? (parsed as { error: unknown }).error
      : parsed;
    throw new EdgeFunctionError(errorMsg, res.status, details);
  }

  return parsed as TResponse;
}
