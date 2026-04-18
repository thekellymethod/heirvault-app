import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

/**
 * GET /api/admin/organizations-list
 * Minimal list for admin forms (e.g. assigning a new client to a firm).
 */
export async function GET() {
  try {
    await requireAdmin();
    const { findMany } = await import("@/lib/db");

    type OrgRow = { id: string; name: string };
    const rows = await findMany<OrgRow>("organizations", {
      orderBy: { column: "name", ascending: true },
      limit: 500,
    });

    return NextResponse.json({
      organizations: (rows ?? []).map((o) => ({ id: o.id, name: o.name })),
    });
  } catch (error: unknown) {
    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status: number }).status === "number"
        ? (error as { status: number }).status
        : 500;
    const message = error instanceof Error ? error.message : "Failed to list organizations";
    return NextResponse.json({ error: message }, { status });
  }
}
