const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendToExpo(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo Push failed: ${res.status} ${await res.text()}`);
  }
}
