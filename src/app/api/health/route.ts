import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/health
 * Health check endpoint that verifies:
 * - Prisma database connection
 * - Returns service status
 */
export async function GET() {
  try {
    // Test Prisma connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
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

