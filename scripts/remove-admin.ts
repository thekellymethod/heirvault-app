import dotenv from "dotenv";
import { Pool } from "pg";

// Load environment variables
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const email = "robertkellydc@gmail.com";
  
  console.log(`Removing admin role for: ${email}`);
  
  // Find user
  const userResult = await pool.query(
    `SELECT id, email, roles FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );

  if (!userResult.rows || userResult.rows.length === 0) {
    console.log(`❌ User not found with email: ${email}`);
    await pool.end();
    process.exit(1);
  }

  const user = userResult.rows[0];
  const currentRoles = user.roles || [];
  
  // Remove ADMIN role if present
  const newRoles = currentRoles.filter((r: string) => r !== "ADMIN");
  
  // Ensure USER role is present
  if (!newRoles.includes("USER")) {
    newRoles.push("USER");
  }
  
  await pool.query(
    `UPDATE users SET roles = $1 WHERE id = $2`,
    [newRoles, user.id]
  );

  console.log(`✅ Updated user: ${user.email}`);
  console.log(`   Previous roles: ${currentRoles.join(", ") || "none"}`);
  console.log(`   New roles: ${newRoles.join(", ")}`);
  console.log(`\n📝 Note: Also remove this email from ADMIN_EMAILS in .env.local to prevent it from being re-added:`);
  console.log(`   ADMIN_EMAILS=robertkellydc@gmail.com  <-- Remove this`);
  console.log(`   Or set it to a different email if you need an admin.`);
}

main()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error:", e);
    pool.end();
    process.exit(1);
  });
