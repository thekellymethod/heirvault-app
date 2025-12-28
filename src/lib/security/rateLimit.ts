// src/lib/security/rateLimit.ts
type Bucket = { count: number; resetAt: number };
const mem = new Map<string, Bucket>();

export function rateLimit(key: string, opts: { limit: number; windowMs: number }) {
  const now = Date.now();
  const b = mem.get(key);
  if (!b || b.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (b.count >= opts.limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { ok: true, remaining: opts.limit - b.count };
}

export function clientIp(req: Request) {
  // Vercel sets x-forwarded-for
  const xf = req.headers.get("x-forwarded-for");
  return (xf?.split(",")[0] ?? "unknown").trim();
}

