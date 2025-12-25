import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return await fixDatabase();
}

export async function POST() {
  return await fixDatabase();
}

async function fixDatabase() {
  try {
    const results: string[] = [];

    // Check if the constraint already exists
    const existingIndex = await prisma.$queryRawUnsafe<Array<{
      indexname: string,
    }>>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (existingIndex.length > 0) {
      results.push("✅ Unique constraint 'users_clerkId_key' already exists");
    } else {
      // Create the unique constraint
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");
      `);
      results.push("✅ Created unique constraint 'users_clerkId_key' on users.clerkId");
    }

    // Verify it was created
    const verifyIndex = await prisma.$queryRawUnsafe<Array<{
      indexname: string,
      indexdef: string,
    }>>(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (verifyIndex.length > 0) {
      results.push(`✅ Verified: ${verifyIndex[0].indexdef}`);
    } else {
      results.push("⚠️ Warning: Could not verify constraint creation");
    }

    // Also check if the column exists
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string,
      data_type: string,
    }>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('clerkId', 'clerk_id')
    `);

    if (columnCheck.length > 0) {
      results.push(`✅ Found column: ${columnCheck[0].column_name} (${columnCheck[0].data_type})`);
    } else {
      results.push("⚠️ Warning: Could not find clerkId or clerk_id column");
    }

    return NextResponse.json({
      ok: true,
      message: "Database fix applied",
      results,
    });
  } catch (e: unknown) {
    const err = e as { message?: string, code?: string };
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fix database",
        message: err?.message ?? String(e),
        code: err?.code,
      },
      { status: 500 }
    );
  }
}

