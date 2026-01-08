import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/health
 * Health check endpoint that verifies:
 * - Supabase database connection
 * - Returns service status
 */
export async function GET() {
  try {
    // Test Supabase connection with a simple query
    const { queryRaw } = await import("@/lib/db");
    await queryRaw(`SELECT 1`, []);
    
    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "connected",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "disconnected",
        },
        error: errorMessage,
      },
      { status: 503 }
    );
  }
}

