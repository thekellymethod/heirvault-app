const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;

const requestStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string) {
  const now = Date.now();
  const entry = requestStore.get(key);

  if (!entry || entry.resetAt < now) {
    requestStore.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return { ok: false, resetAt: entry.resetAt };
  }

  return { ok: true };
}

