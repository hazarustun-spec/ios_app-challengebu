const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo's /push/send endpoint accepts at most 100 messages per request and
// rejects the whole batch with a 400 when you exceed it.
//
// No caller hits that today: dispatch-push, send-push-notification and
// send-message each address a single recipient's device tokens, and
// publish-announcement — the one real fan-out — already slices its own
// 100-message chunks so it can count partial successes. Enforcing the limit
// here anyway means the next fan-out someone writes cannot reintroduce the
// bug by forgetting to chunk; publish-announcement's outer loop simply
// leaves this one with a single iteration per call.
const EXPO_PUSH_BATCH_SIZE = 100;

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendChunk(chunk: ExpoPushMessage[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) {
    throw new Error(`Expo Push failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Deliver push messages to Expo, 100 at a time.
 *
 * Chunks are sent sequentially rather than with Promise.all: Expo rate-limits
 * per-project, and a burst of parallel requests from a fan-out is exactly the
 * shape that trips it. A single announcement to a few thousand devices is a
 * handful of round-trips — well inside an Edge Function's budget.
 *
 * A failing chunk throws, and later chunks are not attempted. Callers already
 * treat push delivery as best-effort (the notification row is written first),
 * so a partial send degrades rather than losing the notification entirely —
 * publish-announcement additionally catches per chunk so one bad slice does
 * not stop the rest of a community-wide send.
 */
export async function sendToExpo(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
    await sendChunk(messages.slice(i, i + EXPO_PUSH_BATCH_SIZE));
  }
}
