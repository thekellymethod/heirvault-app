import { Pool } from "pg";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@heirvault.app";
  
  console.log(`Looking for admin user with email: ${adminEmail}`);
  
  // Find admin user using raw SQL
  const userResult = await pool.query(
    `SELECT id, email, first_name, last_name, roles FROM users WHERE email = $1 LIMIT 1`,
    [adminEmail]
  );

  if (!userResult.rows || userResult.rows.length === 0) {
    console.error(`Admin user with email ${adminEmail} not found.`);
    console.error("Please ensure BOOTSTRAP_ADMIN_EMAIL is set correctly and the user exists.");
    await pool.end();
    process.exit(1);
  }

  const adminUser = userResult.rows[0];
  const roles = Array.isArray(adminUser.roles) ? adminUser.roles : (adminUser.roles ? [adminUser.roles] : []);

  if (!roles.includes("ADMIN")) {
    console.warn(`Warning: User ${adminEmail} does not have ADMIN role. Current roles: ${roles.join(", ")}`);
  }

  console.log(`Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

  // Check if user already has an organization
  const existingMembership = await pool.query(
    `SELECT * FROM org_members WHERE user_id = $1 LIMIT 1`,
    [adminUser.id]
  );

  if (existingMembership.rows && existingMembership.rows.length > 0) {
    console.log("Admin user already has an organization membership.");
    const orgId = existingMembership.rows[0].organization_id;
    const org = await pool.query(
      `SELECT * FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId]
    );
    
    if (org.rows && org.rows.length > 0) {
      console.log(`Existing organization: ${org.rows[0].name} (ID: ${org.rows[0].id})`);
      console.log("If you want to update it, please delete the existing organization first.");
      await pool.end();
      process.exit(0);
    }
  }

  // Organization details
  const orgName = "Robert Kelly DC LLC";
  const address = "1326 Barlow Ave";
  const city = "Dallas";
  const state = "TX";
  const postalCode = "75224";
  const phone = "9725035204"; // Remove spaces and formatting

  // Generate slug
  const slug = orgName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Check if slug exists
  const existingOrg = await pool.query(
    `SELECT * FROM organizations WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  let finalSlug = slug;
  if (existingOrg.rows && existingOrg.rows.length > 0) {
    finalSlug = `${slug}-${randomUUID().slice(0, 8)}`;
    console.log(`Slug ${slug} already exists, using ${finalSlug}`);
  }

  console.log(`Creating organization: ${orgName}`);
  console.log(`Address: ${address}, ${city}, ${state} ${postalCode}`);
  console.log(`Phone: ${phone}`);

  // Create organization and membership in a transaction
  const orgId = randomUUID();
  const memberId = randomUUID();

  try {
    // Use a database transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create organization
      await client.query(
        `INSERT INTO organizations (id, name, slug, address_line1, city, state, postal_code, phone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [orgId, orgName, finalSlug, address, city, state, postalCode, phone]
      );

      // Add admin user as OWNER
      await client.query(
        `INSERT INTO org_members (id, user_id, organization_id, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'OWNER', NOW(), NOW())`,
        [memberId, adminUser.id, orgId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.log("\n✅ Organization created successfully!");
    console.log(`Organization ID: ${orgId}`);
    console.log(`Organization Name: ${orgName}`);
    console.log(`Slug: ${finalSlug}`);
    console.log(`Admin user ${adminUser.email} is now the OWNER of this organization.`);
  } catch (error: any) {
    console.error("Error creating organization:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

