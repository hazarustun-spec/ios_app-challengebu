import { corsHeaders } from './cors.ts';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400, details?: unknown): Response {
  return jsonResponse({ error: { message, details } }, status);
}

export function unauthorized(): Response {
  return errorResponse('Unauthorized', 401);
}

export function forbidden(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

export function notFound(message = 'Not found'): Response {
  return errorResponse(message, 404);
}

export function conflict(message: string): Response {
  return errorResponse(message, 409);
}

export function internalError(err: unknown): Response {
  console.error('[internalError]', err);
  return errorResponse('Internal server error', 500);
}
