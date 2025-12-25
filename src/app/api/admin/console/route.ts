import { NextResponse } from "next/server";
import { COMMAND_MAP } from "@/lib/admin/console/commands";
import { getActorFromRequest } from "@/lib/security/requireApiToken";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  cmd: string,
  args?: Record<string, unknown>;
};

function isConsoleEnabled() {
  return process.env.ADMIN_CONSOLE_ENABLED === "true";
}

// Simple in-memory rate limit (per runtime instance).
// On Vercel serverless this is best-effort (not globally consistent), but still useful.
const bucket = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const b = bucket.get(key);
  if (!b || now > b.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (b.count >= max) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  bucket.set(key, b);
  return { allowed: true, remaining: max - b.count, resetAt: b.resetAt };
}

export async function POST(req: Request) {
  if (!isConsoleEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin console is disabled." }, { status: 404 });
  }

  // Support both Clerk session (requireAdmin) and API token auth
  // getActorFromRequest tries token first, then falls back to Clerk
  // For console, require "console:exec" or "admin" scope
  let actor;
  try {
    actor = await getActorFromRequest(req, { requiredScopes: ["console:exec", "admin"] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication required.";
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 401;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }

  const rl = rateLimit(actor.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded.", meta: { resetAt: rl.resetAt } },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const cmd = (body.cmd ?? "").trim();
  const args = (body.args ?? {}) as Record<string, unknown>;

  const def = COMMAND_MAP[cmd];
  if (!def) {
    return NextResponse.json({ ok: false, error: `Unknown command: ${cmd}` }, { status: 400 });
  }

  // Audit every console invocation (even failed ones)
  const auditId = crypto.randomUUID();
  await prisma.audit_logs.create({
    data: {
      id: auditId,
      userId: actor.id,
      action: "GLOBAL_POLICY_SEARCH_PERFORMED", // Use an existing enum value; add a dedicated one later.
      message: `AdminConsole cmd=${cmd}`,
      createdAt: new Date(),
      // Optional: add org_id/client_id/policy_id if you want later
    },
  });

  try {
    const result = await def.handler({ actor }, args);
    return NextResponse.json({ ...result, meta: { auditId, rate: rl } }, { status: result.ok ? 200 : 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: "Command execution failed.",
        details: { message, cmd, args },
        meta: { auditId, rate: rl },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  if (!isConsoleEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin console is disabled." }, { status: 404 });
  }

  // Support both Clerk session and API token auth
  // For console, require "console:exec" or "admin" scope
  let actor;
  try {
    actor = await getActorFromRequest(req, { requiredScopes: ["console:exec", "admin"] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication required.";
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 401;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }

  // Lightweight info endpoint
  return NextResponse.json({
    ok: true,
    data: {
      actor: { id: actor.id, clerkId: actor.clerkId, email: actor.email, roles: actor.roles },
      commands: Object.keys(COMMAND_MAP),
    },
  });
}

