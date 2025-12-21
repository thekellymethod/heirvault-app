import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * Get attorney credentials
 * Admin-only endpoint
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Get attorneys using raw SQL
    const attorneysResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      bar_number: string | null;
      updated_at: Date;
    }>>(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        bar_number,
        updated_at
      FROM users
      WHERE role = 'attorney'
      ORDER BY email ASC
    `);

    const credentials = attorneysResult.map((attorney) => ({
      id: attorney.id,
      email: attorney.email,
      name: `${attorney.first_name || ""} ${attorney.last_name || ""}`.trim() || attorney.email,
      barNumber: attorney.bar_number,
      status: attorney.bar_number ? ("verified" as const) : ("pending" as const),
      lastVerified: attorney.bar_number ? attorney.updated_at.toISOString() : null,
    }));

    return NextResponse.json({ credentials });
  } catch (error: any) {
    console.error("Error fetching attorney credentials:", error);
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch attorney credentials" },
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
      await prisma.$executeRawUnsafe(
        `UPDATE users SET bar_number = $1, updated_at = NOW() WHERE id = $2`,
        barNumber,
        attorneyId
      );
    } else if (action === "revoke") {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET bar_number = NULL, updated_at = NOW() WHERE id = $1`,
        attorneyId
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating attorney credential:", error);
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update attorney credential" },
      { status: 500 }
    );
  }
}

