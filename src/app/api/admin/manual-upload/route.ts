import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { db, clients, sql } from "@/lib/db";
import { randomUUID } from "crypto";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/admin/manual-upload
 * 
 * Admin-only endpoint to manually create:
 * - Attorneys (User + AttorneyProfile)
 * - Clients (Policy Holders)
 * - Beneficiaries
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { type, data } = body;

    if (!type || !["attorney", "client", "beneficiary"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'attorney', 'client', or 'beneficiary'" },
        { status: 400 }
      );
    }

    switch (type) {
      case "attorney": {
        const {
          email,
          firstName,
          lastName,
          phone,
          lawFirm,
          barNumber,
          licenseState,
        } = data;

        if (!email || !firstName || !lastName || !barNumber || !licenseState) {
          return NextResponse.json(
            { error: "Email, firstName, lastName, barNumber, and licenseState are required for attorneys" },
            { status: 400 }
          );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "User with this email already exists" },
            { status: 400 }
          );
        }

        // Create user with ATTORNEY role
        // Generate a placeholder clerkId for manually created users (format: manual_<uuid>)
        // This satisfies the required unique constraint and can be updated later if the user signs up with Clerk
        const userId = randomUUID();
        const placeholderClerkId = `manual_${randomUUID()}`;
        
        const user = await prisma.user.create({
          data: {
            id: userId,
            clerkId: placeholderClerkId,
            email,
            firstName,
            lastName,
            phone: phone || undefined,
            barNumber: barNumber || undefined,
            roles: ["ATTORNEY"],
          },
        });

        // Create attorney profile
        const profile = await prisma.attorneyProfile.create({
          data: {
            userId: user.id,
            licenseStatus: "ACTIVE",
            licenseState: licenseState || undefined,
            lawFirm: lawFirm || undefined,
            verifiedAt: new Date(),
            appliedAt: new Date(),
          },
        });

        await logAuditEvent({
          action: "ATTORNEY_CREATED",
          resourceType: "attorney",
          resourceId: user.id,
          details: { 
            email, 
            firstName, 
            lastName, 
            barNumber, 
            createdBy: admin.id,
            manuallyCreated: true,
            placeholderClerkId: placeholderClerkId,
            note: "Manually created by admin. User will need to sign up with Clerk to link their account."
          },
          userId: admin.id,
        });

        return NextResponse.json({
          success: true,
          message: "Attorney created successfully",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          profile: {
            id: profile.id,
            licenseStatus: profile.licenseStatus,
          },
        });
      }

      case "client": {
        const {
          email,
          firstName,
          lastName,
          phone,
          dateOfBirth,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
        } = data;

        if (!email || !firstName || !lastName) {
          return NextResponse.json(
            { error: "Email, firstName, and lastName are required for clients" },
            { status: 400 }
          );
        }

        // Check if client already exists
        const existingClient = await db.execute<Array<{ id: string }>>(
          sql`SELECT id FROM clients WHERE email = ${email} LIMIT 1`
        );

        if (existingClient.rows && existingClient.rows.length > 0) {
          return NextResponse.json(
            { error: "Client with this email already exists" },
            { status: 400 }
          );
        }

        const clientId = randomUUID();
        const dateOfBirthValue = dateOfBirth ? new Date(dateOfBirth) : null;

        // Create client using raw SQL
        const clientResult = await db.execute<Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        }>>(
          sql`INSERT INTO clients (id, email, first_name, last_name, phone, date_of_birth, address_line1, address_line2, city, state, postal_code, country, created_at, updated_at)
              VALUES (${clientId}, ${email}, ${firstName}, ${lastName}, ${phone || null}, ${dateOfBirthValue || null}, ${addressLine1 || null}, ${addressLine2 || null}, ${city || null}, ${state || null}, ${postalCode || null}, ${country || null}, NOW(), NOW())
              RETURNING id, first_name, last_name, email`
        );

        if (!clientResult.rows || clientResult.rows.length === 0) {
          throw new Error("Failed to create client");
        }

        const client = clientResult.rows[0];

        await logAuditEvent({
          action: "CLIENT_CREATED",
          resourceType: "client",
          resourceId: client.id,
          details: { email, firstName, lastName, createdBy: admin.id },
          userId: admin.id,
        });

        return NextResponse.json({
          success: true,
          message: "Client created successfully",
          client: {
            id: client.id,
            email: client.email,
            firstName: client.first_name,
            lastName: client.last_name,
          },
        });
      }

      case "beneficiary": {
        const {
          clientId,
          firstName,
          lastName,
          relationship,
          email,
          phone,
          dateOfBirth,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
        } = data;

        if (!clientId || !firstName || !lastName) {
          return NextResponse.json(
            { error: "clientId, firstName, and lastName are required for beneficiaries" },
            { status: 400 }
          );
        }

        // Verify client exists
        const clientCheck = await db.execute<Array<{ id: string }>>(
          sql`SELECT id FROM clients WHERE id = ${clientId} LIMIT 1`
        );

        if (!clientCheck.rows || clientCheck.rows.length === 0) {
          return NextResponse.json(
            { error: "Client not found" },
            { status: 404 }
          );
        }

        const beneficiaryId = randomUUID();
        const dateOfBirthValue = dateOfBirth ? new Date(dateOfBirth) : null;

        // Create beneficiary using raw SQL
        const beneficiaryResult = await db.execute<Array<{
          id: string;
          first_name: string;
          last_name: string;
        }>>(
          sql`INSERT INTO beneficiaries (id, client_id, first_name, last_name, relationship, email, phone, date_of_birth, address_line1, address_line2, city, state, postal_code, country, created_at, updated_at)
              VALUES (${beneficiaryId}, ${clientId}, ${firstName}, ${lastName}, ${relationship || null}, ${email || null}, ${phone || null}, ${dateOfBirthValue || null}, ${addressLine1 || null}, ${addressLine2 || null}, ${city || null}, ${state || null}, ${postalCode || null}, ${country || null}, NOW(), NOW())
              RETURNING id, first_name, last_name`
        );

        if (!beneficiaryResult.rows || beneficiaryResult.rows.length === 0) {
          throw new Error("Failed to create beneficiary");
        }

        const beneficiary = beneficiaryResult.rows[0];

        await logAuditEvent({
          action: "BENEFICIARY_CREATED",
          resourceType: "beneficiary",
          resourceId: beneficiary.id,
          details: { clientId, firstName, lastName, createdBy: admin.id },
          userId: admin.id,
        });

        return NextResponse.json({
          success: true,
          message: "Beneficiary created successfully",
          beneficiary: {
            id: beneficiary.id,
            firstName: beneficiary.first_name,
            lastName: beneficiary.last_name,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Manual upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create record" },
      { status: error.status || 500 }
    );
  }
}

