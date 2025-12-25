import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
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
        const existingClient = await prisma.clients.findFirst({
          where: { email },
          select: { id: true },
        });

        if (existingClient) {
          return NextResponse.json(
            { error: "Client with this email already exists" },
            { status: 400 }
          );
        }

        const clientId = randomUUID();
        const dateOfBirthValue = dateOfBirth ? new Date(dateOfBirth) : null;
        const now = new Date();

        // Create client using Prisma
        const client = await prisma.clients.create({
          data: {
            id: clientId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            date_of_birth: dateOfBirthValue,
            address_line1: addressLine1 || null,
            address_line2: addressLine2 || null,
            city: city || null,
            state: state || null,
            postal_code: postalCode || null,
            country: country || null,
            created_at: now,
            updated_at: now,
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        });

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
        const clientExists = await prisma.clients.findFirst({
          where: { id: clientId },
          select: { id: true },
        });

        if (!clientExists) {
          return NextResponse.json(
            { error: "Client not found" },
            { status: 404 }
          );
        }

        const beneficiaryId = randomUUID();
        const dateOfBirthValue = dateOfBirth ? new Date(dateOfBirth) : null;
        const now = new Date();

        // Create beneficiary using Prisma
        const beneficiary = await prisma.beneficiaries.create({
          data: {
            id: beneficiaryId,
            client_id: clientId,
            first_name: firstName,
            last_name: lastName,
            relationship: relationship || null,
            email: email || null,
            phone: phone || null,
            date_of_birth: dateOfBirthValue,
            address_line1: addressLine1 || null,
            address_line2: addressLine2 || null,
            city: city || null,
            state: state || null,
            postal_code: postalCode || null,
            country: country || null,
            created_at: now,
            updated_at: now,
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        });

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStatus = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
    console.error("Manual upload error:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create record" },
      { status: errorStatus }
    );
  }
}

