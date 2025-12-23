import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { COMMANDS } from "@/lib/admin/console/commands";
import { translateNLToPlan } from "@/lib/admin/nl/translate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function enabled() {
  return process.env.ADMIN_CONSOLE_ENABLED === "true" && process.env.ADMIN_CONSOLE_NL_ENABLED === "true";
}

const WRITE_COMMANDS = new Set(["attorney:verify", "attorney:revoke"]);

export async function POST(req: Request) {
  if (!enabled()) {
    return NextResponse.json({ ok: false, error: "Disabled." }, { status: 404 });
  }

  const actor = await requireAdmin();

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "Missing text." }, { status: 400 });
  }

  const commands = COMMANDS.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    usage: c.usage,
    // Optional: add stricter arg hints over time
    argsSpec: {},
  }));

  const plan = await translateNLToPlan({ text, commands });

  // Audit the plan request (no execution yet)
  const auditId = crypto.randomUUID();
  await prisma.audit_logs.create({
    data: {
      id: auditId,
      user_id: actor.id,
      action: "GLOBAL_POLICY_SEARCH_PERFORMED", // replace later with ADMIN_CONSOLE_PLAN
      message: `AdminNLPlan cmd=${plan.cmd ?? "null"} conf=${plan.confidence}`,
      created_at: new Date(),
    },
  });

  const requiresConfirm =
    plan.cmd ? WRITE_COMMANDS.has(plan.cmd) && process.env.ADMIN_CONSOLE_WRITE_CONFIRM === "true" : false;

  return NextResponse.json({
    ok: true,
    data: {
      plan: { ...plan, requiresConfirm },
      auditId,
    },
  });
}

