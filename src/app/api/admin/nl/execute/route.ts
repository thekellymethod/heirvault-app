import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { COMMAND_MAP } from "@/lib/admin/console/commands";
import { prisma } from "@/lib/prisma";

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

  const body = (await req.json().catch(() => null)) as {
    cmd?: string;
    args?: Record<string, any>;
    confirmed?: boolean;
  } | null;

  const cmd = (body?.cmd ?? "").trim();
  const args = (body?.args ?? {}) as Record<string, any>;
  const confirmed = body?.confirmed === true;

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
  const auditId = crypto.randomUUID();
  await prisma.audit_logs.create({
    data: {
      id: auditId,
      user_id: actor.id,
      action: "GLOBAL_POLICY_SEARCH_PERFORMED", // TODO: Add ADMIN_CONSOLE_NL_EXECUTE to AuditAction enum
      message: `AdminNLExecute cmd=${cmd} confirmed=${confirmed}`,
      created_at: new Date(),
    },
  });

  try {
    const result = await def.handler({ actor }, args);
    return NextResponse.json({ ...result, meta: { auditId } }, { status: result.ok ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Command execution failed.",
        details: { message: e?.message, cmd, args },
        meta: { auditId },
      },
      { status: 500 }
    );
  }
}

