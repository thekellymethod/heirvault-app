#!/usr/bin/env tsx
/**
 * Direct database fix script - bypasses Prisma ORM
 * Run with: npx tsx scripts/fix-db-direct.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), ".env") });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  console.error("   Please set DATABASE_URL in .env.local");
  process.exit(1);
}

async function main() {
  console.log("🔧 Fixing database: Adding unique constraint on users.clerkId...\n");

  // Parse connection string and ensure SSL is enabled
  const connectionConfig: any = {
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 30000, // 30 seconds
    ssl: process.env.DATABASE_URL?.includes('prisma.io') ? {
      rejectUnauthorized: false
    } : undefined,
  };

  const pool = new Pool(connectionConfig);

  const client = await pool.connect();

  try {
    // Check if the constraint already exists
    const checkResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (checkResult.rows.length > 0) {
      console.log("✅ Unique constraint 'users_clerkId_key' already exists!");
      console.log("   No action needed.\n");
      return;
    }

    // Create the unique constraint
    console.log("Creating unique constraint...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");
    `);
    console.log("✅ Created unique constraint 'users_clerkId_key' on users.clerkId\n");

    // Verify it was created
    const verifyResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'users_clerkId_key'
    `);

    if (verifyResult.rows.length > 0) {
      console.log("✅ Verification successful!");
      console.log(`   ${verifyResult.rows[0].indexdef}\n`);
    } else {
      console.log("⚠️  Warning: Could not verify constraint creation\n");
    }

    // Check if the column exists
    const columnResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('clerkId', 'clerk_id')
    `);

    if (columnResult.rows.length > 0) {
      console.log(`✅ Found column: ${columnResult.rows[0].column_name} (${columnResult.rows[0].data_type})\n`);
    } else {
      console.log("⚠️  Warning: Could not find clerkId or clerk_id column\n");
    }

    console.log("🎉 Database fix complete! You can now restart your dev server.\n");
  } catch (error) {
    console.error("❌ Error fixing database:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`   ${error.stack.split('\n')[1]}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

