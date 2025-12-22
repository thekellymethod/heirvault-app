import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Check if users table exists
    const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists;
    `);

    if (!tableExists[0]?.exists) {
      return NextResponse.json({ 
        ok: false, 
        error: "users table does not exist",
        fix: "Run your database migrations: npx drizzle-kit push or npx prisma migrate dev"
      });
    }

    // Check column existence and uniqueness
    const columnInfo = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('clerkId', 'clerk_id')
      ORDER BY column_name;
    `);

    // Check for unique constraints/indexes on clerkId columns
    const uniqueConstraints = await prisma.$queryRawUnsafe<Array<{
      index_name: string;
      column_name: string;
      is_unique: boolean;
    }>>(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_attribute a ON a.attrelid = t.oid
      JOIN pg_index ix ON ix.indrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE t.relname = 'users'
        AND a.attname IN ('clerkId', 'clerk_id')
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND ix.indisunique = true
      ORDER BY a.attname;
    `);

    // Check all indexes (unique and non-unique) for reference
    const allIndexes = await prisma.$queryRawUnsafe<Array<{
      index_name: string;
      column_name: string;
      is_unique: boolean;
    }>>(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_attribute a ON a.attrelid = t.oid
      LEFT JOIN pg_index ix ON ix.indrelid = t.oid AND a.attnum = ANY(ix.indkey)
      LEFT JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE t.relname = 'users'
        AND a.attname IN ('clerkId', 'clerk_id')
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attname, ix.indisunique DESC NULLS LAST;
    `);

    const hasUniqueConstraint = uniqueConstraints.length > 0;
    const clerkIdColumn = columnInfo.find(c => c.column_name === 'clerkId');
    const clerk_idColumn = columnInfo.find(c => c.column_name === 'clerk_id');

    return NextResponse.json({ 
      ok: true,
      tableExists: tableExists[0]?.exists,
      columns: columnInfo,
      uniqueConstraints,
      allIndexes,
      summary: {
        hasClerkIdColumn: !!clerkIdColumn,
        hasClerk_idColumn: !!clerk_idColumn,
        hasUniqueConstraint,
        recommendedColumn: clerkIdColumn ? 'clerkId' : clerk_idColumn ? 'clerk_id' : 'NONE FOUND',
        fix: !hasUniqueConstraint ? (
          clerkIdColumn 
            ? `CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");`
            : clerk_idColumn
            ? `CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");`
            : "Column not found - check your schema"
        ) : "No fix needed - unique constraint exists"
      }
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { ok: false, message: err?.message ?? String(e) },
      { status: 500 }
    );
  }
}

