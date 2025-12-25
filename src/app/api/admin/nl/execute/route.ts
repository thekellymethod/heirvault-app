import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { COMMAND_MAP } from "@/lib/admin/console/commands";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const WRITE_COMMANDS = new Set(["attorney:verify", "attorney:revoke"]);

function enabled() {
  return process.env.ADMIN_CONSOLE_ENABLED === "true" && process.env.ADMIN_CONSOLE_NL_ENABLED === "true";
}

export async function POST(req: Request) {
  if (!enabled()) {
    return NextResponse.json({ ok: false, error: "Disabled." }, { status: 404 });
  }

  const actor = await requireAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyObj = body as { cmd?: unknown; args?: unknown; confirmed?: unknown };
  const cmd = typeof bodyObj.cmd === "string" ? bodyObj.cmd.trim() : "";
  const args = (bodyObj.args && typeof bodyObj.args === "object" && bodyObj.args !== null && !Array.isArray(bodyObj.args))
    ? (bodyObj.args as Record<string, unknown>)
    : {};
  const confirmed = bodyObj.confirmed === true;

  const def = COMMAND_MAP[cmd];
  if (!def) {
    return NextResponse.json({ ok: false, error: `Unknown command: ${cmd}` }, { status: 400 });
  }

  if (WRITE_COMMANDS.has(cmd) && process.env.ADMIN_CONSOLE_WRITE_CONFIRM === "true" && !confirmed) {
    return NextResponse.json(
      { ok: false, error: "Confirmation required for write commands." },
      { status: 409 }
    );
  }

  // Audit log the execution
  const auditId = randomUUID();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, user_id, action, message, createdAt) VALUES ($1, $2, $3, $4, NOW())`,
      auditId,
      actor.id,
      "GLOBAL_POLICY_SEARCH_PERFORMED", // TODO: Add ADMIN_CONSOLE_NL_EXECUTE to AuditAction enum
      `AdminNLExecute cmd=${cmd} confirmed=${confirmed}`
    );
  } catch (auditError: unknown) {
    console.error("Failed to log audit event:", auditError);
    // Don't fail the request if audit logging fails
  }

  try {
    const result = await def.handler({ actor }, args);
    return NextResponse.json({ ...result, meta: { auditId } }, { status: result.ok ? 200 : 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: "Command execution failed.",
        details: { message, cmd, args },
        meta: { auditId },
      },
      { status: 500 }
    );
  }
}

