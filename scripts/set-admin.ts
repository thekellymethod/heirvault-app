import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const email = "robertkellydc@gmail.com";
  
  console.log(`Setting admin role for: ${email}`);
  
  // Find user
  const userResult = await pool.query(
    `SELECT id, email, roles FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );

  if (!userResult.rows || userResult.rows.length === 0) {
    console.log(`❌ User not found with email: ${email}`);
    console.log(`   Make sure the user has signed in at least once.`);
    await pool.end();
    process.exit(1);
  }

  const user = userResult.rows[0];
  const currentRoles = user.roles || [];
  
  // Update roles to include ADMIN if not already present
  const newRoles = currentRoles.includes("ADMIN") 
    ? currentRoles 
    : [...new Set([...currentRoles, "USER", "ADMIN"])];
  
  await pool.query(
    `UPDATE users SET roles = $1 WHERE id = $2`,
    [newRoles, user.id]
  );

  console.log(`✅ Updated user: ${user.email}`);
  console.log(`   Previous roles: ${currentRoles.join(", ") || "none"}`);
  console.log(`   New roles: ${newRoles.join(", ")}`);
  console.log(`\n📝 Note: Make sure to add this email to ADMIN_EMAILS in .env.local:`);
  console.log(`   ADMIN_EMAILS=robertkellydc@gmail.com`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
