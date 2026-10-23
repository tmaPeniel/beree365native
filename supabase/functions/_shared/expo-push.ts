const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type ExpoPushPayload = {
  body: string;
  data?: Record<string, unknown>;
  title: string;
};

export type ExpoPushResult = {
  deviceNotRegistered: boolean;
  error?: string;
  ok: boolean;
  ticketId?: string;
};

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value);
}

export async function sendExpoPush(
  token: string,
  payload: ExpoPushPayload,
): Promise<ExpoPushResult> {
  if (!isExpoPushToken(token)) {
    return { deviceNotRegistered: false, error: 'Invalid Expo push token', ok: false };
  }

  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const response = await fetch(EXPO_PUSH_URL, {
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }),
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: 'POST',
  });

  const responseBody = await response.json().catch(() => null) as {
    data?: { details?: { error?: string }; id?: string; message?: string; status?: string };
    errors?: Array<{ message?: string }>;
  } | null;
  const ticket = responseBody?.data;
  const errorCode = ticket?.details?.error;

  if (!response.ok || ticket?.status !== 'ok') {
    return {
      deviceNotRegistered: errorCode === 'DeviceNotRegistered',
      error: ticket?.message || responseBody?.errors?.[0]?.message || `Expo push ${response.status}`,
      ok: false,
    };
  }

  return {
    deviceNotRegistered: false,
    ok: true,
    ticketId: ticket.id,
  };
}
