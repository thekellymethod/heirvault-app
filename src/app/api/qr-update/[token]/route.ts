import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

export const runtime = "nodejs";

/**
 * Submit a versioned update via QR code
 * Creates a new version entry preserving historical chain
 * Public endpoint - no authentication required
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { clientId, client, policies, beneficiaries } = body;

    // Verify token matches client
    let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);
    if (!invite) {
      invite = await lookupClientInvite(token);
    }

    if (!invite || invite.clientId !== clientId) {
      return NextResponse.json(
        { error: "Invalid token or client mismatch" },
        { status: 403 }
      );
    }

    // Get current version number
    const versionCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::int as count
      FROM client_versions
      WHERE client_id = $1
    `, clientId);

    const versionNumber = (versionCount[0]?.count || 0) + 1;

    // Get previous version ID if exists
    const previousVersion = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM client_versions
      WHERE client_id = $1
      ORDER BY version_number DESC
      LIMIT 1
    `, clientId);

    const previousVersionId = previousVersion.length > 0 ? previousVersion[0].id : null;

    // Get current client data to calculate changes
    const currentClient = await prisma.$queryRawUnsafe<Array<{
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      date_of_birth: Date | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    }>>(`
      SELECT 
        first_name, last_name, email, phone, date_of_birth,
        address_line1, address_line2, city, state, postal_code, country
      FROM clients
      WHERE id = $1
      LIMIT 1
    `, clientId);

    // Calculate changes
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (currentClient.length > 0) {
      const current = currentClient[0];
      if (current.first_name !== client.firstName) {
        changes.firstName = { from: current.first_name, to: client.firstName };
      }
      if (current.last_name !== client.lastName) {
        changes.lastName = { from: current.last_name, to: client.lastName };
      }
      if (current.email !== client.email) {
        changes.email = { from: current.email, to: client.email };
      }
      if (current.phone !== client.phone) {
        changes.phone = { from: current.phone, to: client.phone };
      }
      if (current.address_line1 !== client.addressLine1) {
        changes.addressLine1 = { from: current.address_line1, to: client.addressLine1 };
      }
      // Add more change tracking as needed
    }

    // Create version entry
    const versionId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO client_versions (
        id, client_id, invite_id, version_number, previous_version_id,
        client_data, policies_data, beneficiaries_data, changes,
        submitted_by, submission_method, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      )
    `,
      versionId,
      clientId,
      invite.id,
      versionNumber,
      previousVersionId,
      JSON.stringify(client),
      JSON.stringify(policies),
      JSON.stringify(beneficiaries),
      JSON.stringify(changes),
      "CLIENT",
      "QR_CODE"
    );

    // CRITICAL: Validate client data BEFORE updating database
    // This prevents empty strings from being stored, which is inconsistent with
    // policy-intake route validation. Database NOT NULL only rejects NULL, not empty strings.
    const clientValidationErrors: string[] = [];
    
    if (!client.firstName || String(client.firstName).trim() === "") {
      clientValidationErrors.push("First name is required");
    }
    
    if (!client.lastName || String(client.lastName).trim() === "") {
      clientValidationErrors.push("Last name is required");
    }
    
    if (!client.email || String(client.email).trim() === "") {
      clientValidationErrors.push("Email is required");
    }
    
    // Also validate email format (basic check)
    if (client.email && String(client.email).trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(client.email).trim())) {
        clientValidationErrors.push("Email must be a valid email address");
      }
    }
    
    if (clientValidationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed. Please fix the following errors:",
          details: clientValidationErrors,
        },
        { status: 400 }
      );
    }

    // Update actual client record (but preserve history in versions)
    // Use trimmed values to ensure consistency
    await prisma.$executeRawUnsafe(`
      UPDATE clients
      SET 
        first_name = $2,
        last_name = $3,
        email = $4,
        phone = $5,
        date_of_birth = CASE WHEN $6 = '' OR $6 IS NULL THEN NULL ELSE $6::date END,
        address_line1 = $7,
        address_line2 = $8,
        city = $9,
        state = $10,
        postal_code = $11,
        country = $12,
        updated_at = NOW()
      WHERE id = $1
    `,
      clientId,
      String(client.firstName).trim(),
      String(client.lastName).trim(),
      String(client.email).trim(),
      client.phone ? String(client.phone).trim() || null : null,
      client.dateOfBirth || null,
      client.addressLine1 ? String(client.addressLine1).trim() || null : null,
      client.addressLine2 ? String(client.addressLine2).trim() || null : null,
      client.city ? String(client.city).trim() || null : null,
      client.state ? String(client.state).trim() || null : null,
      client.postalCode ? String(client.postalCode).trim() || null : null,
      client.country ? String(client.country).trim() || null : null
    );

    // CRITICAL: Check for existing policies BEFORE validation
    // This prevents accidental deletion of all data via empty array submission
    const existingPoliciesCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::int as count
      FROM policies
      WHERE client_id = $1
    `, clientId);

    const hasExistingPolicies = (existingPoliciesCount[0]?.count || 0) > 0;

    // CRITICAL: Validate policies BEFORE deleting existing data
    // This prevents silent data loss when required fields are missing
    const policiesArray = policies || [];
    const invalidPolicies: number[] = [];
    const validPolicies: Array<typeof policies[number]> = [];
    
    // Check if empty array is submitted when existing policies exist
    // This prevents accidental deletion of all policies via direct API calls
    if (policiesArray.length === 0 && hasExistingPolicies) {
      return NextResponse.json(
        {
          error: "Validation failed. Please fix the following errors:",
          details: [
            "Cannot remove all policies. At least one policy is required. If you need to remove all policies, please contact support."
          ],
        },
        { status: 400 }
      );
    }
    
    policiesArray.forEach((policy: typeof policies[number], index: number) => {
      if (!policy.insurerName || String(policy.insurerName).trim() === "") {
        invalidPolicies.push(index + 1); // 1-indexed for user-friendly error messages
      } else {
        validPolicies.push(policy);
      }
    });

    // CRITICAL: Validate beneficiaries BEFORE deleting existing data
    const beneficiariesArray = beneficiaries || [];
    const invalidBeneficiaries: number[] = [];
    const validBeneficiaries: Array<typeof beneficiaries[number]> = [];
    
    // Check if empty array is submitted when existing beneficiaries exist
    // Note: Beneficiaries can be empty, but we validate to prevent accidental deletion
    // For beneficiaries, we allow empty array (unlike policies which require at least one)
    // If you want to require at least one beneficiary, uncomment the check below:
    // if (beneficiariesArray.length === 0 && hasExistingBeneficiaries) {
    //   return NextResponse.json(
    //     {
    //       error: "Validation failed. Please fix the following errors:",
    //       details: [
    //         "Cannot remove all beneficiaries. At least one beneficiary is required."
    //       ],
    //     },
    //     { status: 400 }
    //   );
    // }
    
    beneficiariesArray.forEach((beneficiary: typeof beneficiaries[number], index: number) => {
      if (!beneficiary.firstName || String(beneficiary.firstName).trim() === "" || 
          !beneficiary.lastName || String(beneficiary.lastName).trim() === "") {
        invalidBeneficiaries.push(index + 1); // 1-indexed for user-friendly error messages
      } else {
        validBeneficiaries.push(beneficiary);
      }
    });

    // Return error if any required fields are missing
    // This prevents silent data loss - user must fix the form before submission
    if (invalidPolicies.length > 0 || invalidBeneficiaries.length > 0) {
      const errors: string[] = [];
      
      if (invalidPolicies.length > 0) {
        errors.push(
          `Policy ${invalidPolicies.length === 1 ? "entry" : "entries"} ${invalidPolicies.join(", ")} ${invalidPolicies.length === 1 ? "is" : "are"} missing required Insurance Company name. Please provide an insurer name for all policies or remove the policy entry.`
        );
      }
      
      if (invalidBeneficiaries.length > 0) {
        errors.push(
          `Beneficiary ${invalidBeneficiaries.length === 1 ? "entry" : "entries"} ${invalidBeneficiaries.join(", ")} ${invalidBeneficiaries.length === 1 ? "is" : "are"} missing required first name or last name. Please provide both names for all beneficiaries or remove the beneficiary entry.`
        );
      }

      return NextResponse.json(
        { 
          error: "Validation failed. Please fix the following errors:",
          details: errors,
          invalidPolicies: invalidPolicies.length > 0 ? invalidPolicies : undefined,
          invalidBeneficiaries: invalidBeneficiaries.length > 0 ? invalidBeneficiaries : undefined,
        },
        { status: 400 }
      );
    }

    // Only delete existing data AFTER validation passes
    // This ensures we never lose data due to invalid submissions
    await prisma.$executeRawUnsafe(`
      DELETE FROM policies WHERE client_id = $1
    `, clientId);

    // Get or find insurers and insert policies (all validated now)
    // Lazy insurers: don't auto-create, store raw name if not found
    for (const policy of validPolicies) {
      // Try to find existing insurer
      let insurerId: string | null = null;
      let carrierNameRaw: string | null = null;
      
      const existingInsurer = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM insurers WHERE name = $1 LIMIT 1
      `, policy.insurerName.trim());

      if (existingInsurer.length > 0) {
        insurerId = existingInsurer[0].id;
      } else {
        // Insurer not found - store raw name instead (lazy insurers)
        carrierNameRaw = policy.insurerName.trim();
      }

      // Create policy
      // CRITICAL: Explicitly set verification_status to 'PENDING' for consistency
      // with policy-intake route. While the database has a default, using raw SQL
      // requires explicit values to ensure consistent behavior across all creation paths.
      await prisma.$executeRawUnsafe(`
        INSERT INTO policies (id, client_id, insurer_id, carrier_name_raw, policy_number, policy_type, verification_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
      `, randomUUID(), clientId, insurerId, carrierNameRaw, policy.policyNumber?.trim() || null, policy.policyType?.trim() || null);
    }

    // Only delete existing beneficiaries AFTER validation passes
    await prisma.$executeRawUnsafe(`
      DELETE FROM beneficiaries WHERE client_id = $1
    `, clientId);

    // Insert validated beneficiaries
    for (const beneficiary of validBeneficiaries) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO beneficiaries (
          id, client_id, first_name, last_name, relationship, email, phone, date_of_birth, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          CASE WHEN $8 = '' OR $8 IS NULL THEN NULL ELSE $8::date END,
          NOW(), NOW()
        )
      `,
        randomUUID(),
        clientId,
        beneficiary.firstName.trim(),
        beneficiary.lastName.trim(),
        beneficiary.relationship?.trim() || null,
        beneficiary.email?.trim() || null,
        beneficiary.phone?.trim() || null,
        beneficiary.dateOfBirth || null
      );
    }

    // Note: Audit logging is handled by the versioning system
    // The client_versions table preserves the complete audit trail

    return NextResponse.json({
      success: true,
      versionNumber,
      versionId,
      message: "Update submitted successfully. A new version entry has been created.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing QR update:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to process update" },
      { status: 500 }
    );
  }
}

