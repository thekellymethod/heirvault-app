#!/usr/bin/env tsx
/**
 * Quick script to fix the database by adding the missing unique constraint
 * Run with: npx tsx scripts/fix-database.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Also try .env as fallback
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), ".env") });
}

import { prisma } from "../src/lib/db";

async function main() {
  console.log("🔧 Fixing database: Adding unique constraint on users.clerkId...\n");

  try {
    // Check if the constraint already exists
    const existingIndex = await prisma.$queryRawUnsafe<Array<{
      indexname: string;
    }>>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (existingIndex.length > 0) {
      console.log("✅ Unique constraint 'users_clerkId_key' already exists!");
      console.log("   No action needed.\n");
      return;
    }

    // Create the unique constraint
    console.log("Creating unique constraint...");
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");
    `);
    console.log("✅ Created unique constraint 'users_clerkId_key' on users.clerkId\n");

    // Verify it was created
    const verifyIndex = await prisma.$queryRawUnsafe<Array<{
      indexname: string;
      indexdef: string;
    }>>(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (verifyIndex.length > 0) {
      console.log("✅ Verification successful!");
      console.log(`   ${verifyIndex[0].indexdef}\n`);
    } else {
      console.log("⚠️  Warning: Could not verify constraint creation\n");
    }

    // Check if the column exists
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
    }>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('clerkId', 'clerk_id')
    `);

    if (columnCheck.length > 0) {
      console.log(`✅ Found column: ${columnCheck[0].column_name} (${columnCheck[0].data_type})\n`);
    } else {
      console.log("⚠️  Warning: Could not find clerkId or clerk_id column\n");
    }

    console.log("🎉 Database fix complete! You can now restart your dev server.\n");
  } catch (error) {
    console.error("❌ Error fixing database:");
    console.error(error);
    process.exit(1);
  } finally {
    // Close the connection
    process.exit(0);
  }
}

main();

