import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadDocument } from "@/lib/storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // No authentication required - anyone can apply

    // Parse form data
    const formData = await req.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    // Normalize email to lowercase for consistent matching across OAuth providers
    // This ensures Apple ID, Gmail, and Microsoft accounts all match correctly
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const phone = formData.get("phone") as string | null;
    const lawFirm = formData.get("lawFirm") as string | null;
    const barNumber = formData.get("barNumber") as string;
    const licenseState = formData.get("licenseState") as string;
    const licenseFile = formData.get("licenseDocument") as File | null;

    if (!firstName || !lastName || !email || !barNumber || !licenseState) {
      return NextResponse.json(
        { error: "First name, last name, email, bar number, and license state are required" },
        { status: 400 }
      );
    }

    // Upload license document if provided
    let licenseDocumentPath: string | null = null;
    let licenseDocumentName: string | null = null;

    if (licenseFile && licenseFile.size > 0) {
      try {
        const arrayBuffer = await licenseFile.arrayBuffer();
        const uploaded = await uploadDocument({
          fileBuffer: arrayBuffer,
          filename: licenseFile.name,
          contentType: licenseFile.type || "application/pdf",
        });
        licenseDocumentPath = uploaded.storagePath;
        licenseDocumentName = licenseFile.name;
      } catch (uploadError: unknown) {
        const message = uploadError instanceof Error ? uploadError.message : "Unknown error";
        console.error("License document upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload license document: ${message}` },
          { status: 400 }
        );
      }
    }

    // Find or create user by email (no Clerk authentication required)
    // If user doesn't exist, create with placeholder clerkId
    // When they sign in later with Clerk (Apple, Google, Microsoft), their account will be linked via email
    // Use case-insensitive email lookup to handle different OAuth providers
    const userByEmailResult = await prisma.$queryRawUnsafe<Array<{
      id: string,
    }>>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      email
    );

    let dbUser = userByEmailResult.length > 0 
      ? await prisma.user.findUnique({
          where: { id: userByEmailResult[0].id },
          include: { attorneyProfile: true },
        })
      : null;

    // SECURITY: Check if resubmission is allowed BEFORE updating any personal information
    // This prevents unauthorized modification of user data via email enumeration
    if (dbUser) {
      const existingProfile = dbUser.attorneyProfile;
      
      // If profile exists and is not PENDING, don't allow resubmission
      // Return early without modifying any user data
      if (existingProfile && existingProfile.licenseStatus !== "PENDING") {
        return NextResponse.json(
          { 
            error: "Attorney application already submitted",
            status: existingProfile.licenseStatus,
            message: `Your application status is: ${existingProfile.licenseStatus}. Please contact an administrator if you need to update your information.`
          },
          { status: 400 }
        );
      }

      // SECURITY: If user exists but has NO attorney profile, do NOT allow modification
      // This prevents attackers from overwriting existing users' personal data
      // Users without attorney profiles should sign in first or contact support
      if (!existingProfile) {
        return NextResponse.json(
          { 
            error: "User account already exists",
            message: "An account with this email already exists. Please sign in to submit an attorney application, or contact support if you need assistance."
          },
          { status: 400 }
        );
      }
    }

    // Only update/create user if we're actually going to process the application
    if (!dbUser) {
      // Create new user with placeholder clerkId
      // Format: pending_<uuid> to indicate they haven't signed in yet
      const placeholderClerkId = `pending_${randomUUID()}`;
      dbUser = await prisma.user.create({
        data: {
          clerkId: placeholderClerkId,
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          barNumber,
          roles: ["USER"], // Will be updated to include ATTORNEY when profile is created
        },
        include: { attorneyProfile: true },
      });
    } else {
      // Only update personal information if we're processing the application
      // At this point, we know the user exists AND has a PENDING profile (checked above)
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          firstName: firstName || dbUser.firstName,
          lastName: lastName || dbUser.lastName,
          phone: phone || dbUser.phone,
          barNumber: barNumber || dbUser.barNumber,
        },
        include: { attorneyProfile: true },
      });
    }

    // Get the profile (should be null or PENDING at this point)
    const existingProfile = dbUser.attorneyProfile;

    // Create or update attorney profile with PENDING status
    const profile = existingProfile
      ? await prisma.attorneyProfile.update({
          where: { userId: dbUser.id },
          data: {
            licenseStatus: "PENDING",
            licenseState: licenseState || undefined,
            lawFirm: lawFirm || undefined,
            licenseDocumentPath: licenseDocumentPath || undefined,
            licenseDocumentName: licenseDocumentName || undefined,
            appliedAt: new Date(), // Update application timestamp
          },
        })
      : await prisma.attorneyProfile.create({
          data: {
            userId: dbUser.id,
            licenseStatus: "PENDING",
            licenseState: licenseState || undefined,
            lawFirm: lawFirm || undefined,
            licenseDocumentPath: licenseDocumentPath || undefined,
            licenseDocumentName: licenseDocumentName || undefined,
          },
        });

    // Add ATTORNEY role if not already present
    if (!dbUser.roles.includes("ATTORNEY")) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          roles: [...dbUser.roles, "ATTORNEY"],
        },
      });
    }

    return NextResponse.json(
      {
        message: "Attorney application submitted successfully",
        profile: {
          id: profile.id,
          licenseStatus: profile.licenseStatus,
          appliedAt: profile.appliedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit attorney application";
    const status = (error && typeof error === "object" && "status" in error && typeof error.status === "number") ? error.status : 500;
    console.error("Attorney apply error:", error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
