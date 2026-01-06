// src/app/api/client/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs"; // ensures crypto + req.ip behavior is consistent

type ClientCommand =
  | { type: "fingerprint"; payload?: Record<string, unknown> }
  | { type: "audit"; payload: { event: string; meta?: Record<string, unknown> } };

function getIp(req: NextRequest): string {
  // Best-effort IP extraction. In production behind proxies, x-forwarded-for is what you usually want.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  // NextRequest doesn't always expose a direct IP (varies by deployment), so fall back safely
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function normalizeUA(ua: string | null): string {
  if (!ua) return "";
  // Keep it lightweight; remove excessive entropy (versions, etc.) if you want more privacy later.
  return ua.slice(0, 300);
}

function makeFingerprint(req: NextRequest) {
  const ip = getIp(req);
  const ua = normalizeUA(req.headers.get("user-agent"));
  const accept = req.headers.get("accept") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const encoding = req.headers.get("accept-encoding") ?? "";
  const tz = req.headers.get("x-client-timezone") ?? ""; // optional, client can send
  const platform = req.headers.get("sec-ch-ua-platform") ?? "";
  const mobile = req.headers.get("sec-ch-ua-mobile") ?? "";

  // IMPORTANT: this is not a “device fingerprint” in the surveillance sense.
  // It's a request-consistency hash so you can detect obvious anomalies and power basic audit.
  const raw = [
    ip,
    ua,
    accept,
    lang,
    encoding,
    tz,
    platform,
    mobile,
  ].join("|");

  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  return {
    hash,
    ip,
    ua,
    signals: { lang, tz, platform, mobile },
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    status: 200,
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(req: NextRequest) {
  // Simple health + fingerprint preview (useful for debugging)
  const fp = makeFingerprint(req);
  return json({
    ok: true,
    type: "fingerprint",
    fingerprint: fp.hash,
    ip: fp.ip,
    ua: fp.ua,
    signals: fp.signals,
  });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  let body: ClientCommand | null = null;
  try {
    body = (await req.json()) as ClientCommand;
  } catch {
    return NextResponse.json(
      { ok: false, requestId, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body?.type) {
    return NextResponse.json(
      { ok: false, requestId, error: "Missing command type" },
      { status: 400 }
    );
  }

  const fp = makeFingerprint(req);

  // Command router
  switch (body.type) {
    case "fingerprint": {
      return json({
        ok: true,
        requestId,
        type: "fingerprint",
        fingerprint: fp.hash,
        ip: fp.ip,
        ua: fp.ua,
        signals: fp.signals,
      });
    }

    case "audit": {
      // Minimal audit stub. You can wire this to Supabase later.
      // Example hardening later:
      // - require Clerk auth
      // - attach auth subject
      // - insert into audit_logs via Supabase with RLS
      const event = body.payload?.event?.trim();
      if (!event) {
        return NextResponse.json(
          { ok: false, requestId, error: "Missing audit event" },
          { status: 400 }
        );
      }

      return json({
        ok: true,
        requestId,
        type: "audit",
        recorded: true,
        event,
        fingerprint: fp.hash,
      });
    }

    default: {
      return NextResponse.json(
        { ok: false, requestId, error: `Unknown command type` },
        { status: 400 }
      );
    }
  }
}
