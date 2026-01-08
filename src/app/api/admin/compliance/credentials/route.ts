import { NextRequest, NextResponse } from "next/server";
;
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/errors";

/**
 * Get attorney credentials
 * Admin-only endpoint
 */
export async function GET() {
  try {
    await requireAdmin();

    const { queryRaw, update: updateUser } = await import("@/lib/db");
    
    // Get attorneys using raw SQL
    const attorneysResult = await queryRaw<Array<{
      id: string,
      email: string,
      firstName: string | null;
      lastName: string | null;
      bar_number: string | null;
      updated_at: Date;
    }>>(`
      SELECT 
        id,
        email,
        "firstName",
        "lastName",
        bar_number,
        updated_at
      FROM users
      WHERE role = 'ATTORNEY'
      ORDER BY email ASC
    `, []);

    const credentials = (attorneysResult || []).map((attorney) => ({
      id: attorney.id,
      email: attorney.email,
      name: `${attorney.firstName || ""} ${attorney.lastName || ""}`.trim() || attorney.email,
      barNumber: attorney.bar_number,
      status: attorney.bar_number ? ("verified" as const) : ("pending" as const),
      lastVerified: attorney.bar_number ? (typeof attorney.updated_at === 'string' ? attorney.updated_at : new Date(attorney.updated_at).toISOString()) : null,
    }));

    return NextResponse.json({ credentials });
  } catch (error: unknown) {
    console.error("Error fetching attorney credentials:", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch attorney credentials" },
      { status: 500 }
    );
  }
}

/**
 * Update attorney credential (e.g., verify bar number)
 * Admin-only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { attorneyId, barNumber, action } = body;

    if (!attorneyId) {
      return NextResponse.json({ error: "Attorney ID is required" }, { status: 400 });
    }

    if (action === "verify" && barNumber) {
      await updateUser("users", { id: attorneyId }, {
        barNumber: barNumber,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    } else if (action === "revoke") {
      await updateUser("users", { id: attorneyId }, {
        barNumber: null,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating attorney credential:", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage || "Failed to update attorney credential" },
      { status: 500 }
    );
  }
}

