import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { putObject } from "@/lib/storage";
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
        const buffer = Buffer.from(arrayBuffer);
        const documentKey = `private/attorney-applications/${randomUUID()}-${licenseFile.name}`;
        await putObject({
          key: documentKey,
          body: buffer,
          contentType: licenseFile.type || "application/pdf",
        });
        licenseDocumentPath = documentKey;
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
    const { findUnique: findUniqueUser, findMany: findManyProfiles, getDb, create: createDb, update: updateDb } = await import("@/lib/db");
    const db = getDb();
    
    type UserRecord = {
      id: string;
      clerkId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      barNumber: string | null;
      roles: string[];
    };
    
    type AttorneyProfileRecord = {
      id: string;
      userId: string;
      licenseStatus: string;
      licenseState: string | null;
      lawFirm: string | null;
      licenseDocumentPath: string | null;
      licenseDocumentName: string | null;
      appliedAt: string | null;
    };
    
    // Case-insensitive email lookup
    const { data: userByEmailResult } = await db
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1);

    let dbUser: (UserRecord & { attorneyProfile: AttorneyProfileRecord | null }) | null = null;
    
    if (userByEmailResult && userByEmailResult.length > 0) {
      const userId = userByEmailResult[0].id as string;
      const foundUser = await findUniqueUser<UserRecord>("users", { id: userId });
      
      if (foundUser) {
        // Fetch attorney profile separately
        const profiles = await findManyProfiles<AttorneyProfileRecord>("attorney_profiles", {
          where: { userId: foundUser.id },
          limit: 1,
        });
        
        const profile = (profiles && profiles.length > 0 ? profiles[0] : null) as AttorneyProfileRecord | null;
        dbUser = {
          ...foundUser,
          attorneyProfile: profile,
        } as unknown as (UserRecord & { attorneyProfile: AttorneyProfileRecord | null });
      }
    }

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
      const newUser = await createDb("users", {
        id: randomUUID(),
        clerkId: placeholderClerkId,
        email,
        firstName,
        lastName,
        phone: phone || null,
        barNumber,
        roles: ["USER"], // Will be updated to include ATTORNEY when profile is created
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }) as UserRecord;
      
      dbUser = {
        ...newUser,
        attorneyProfile: null,
      };
    } else {
      // Only update personal information if we're processing the application
      // At this point, we know the user exists AND has a PENDING profile (checked above)
      await updateDb("users", { id: dbUser.id }, {
        firstName: firstName || dbUser.firstName,
        lastName: lastName || dbUser.lastName,
        phone: phone || dbUser.phone,
        barNumber: barNumber || dbUser.barNumber,
        updatedAt: new Date().toISOString(),
      });
      
      // Refetch user to get updated data
      const updatedUser = await findUniqueUser<UserRecord>("users", { id: dbUser.id });
      if (updatedUser) {
        dbUser = {
          ...updatedUser,
          attorneyProfile: dbUser.attorneyProfile,
        } as UserRecord & { attorneyProfile: AttorneyProfileRecord | null };
      }
    }

    // Get the profile (should be null or PENDING at this point)
    const existingProfile = dbUser.attorneyProfile;

    // Create or update attorney profile with PENDING status
    const profile = existingProfile
      ? await updateDb("attorney_profiles", { userId: dbUser.id }, {
          licenseStatus: "PENDING",
          licenseState: licenseState || null,
          lawFirm: lawFirm || null,
          licenseDocumentPath: licenseDocumentPath || null,
          licenseDocumentName: licenseDocumentName || null,
          appliedAt: new Date().toISOString(), // Update application timestamp
        }) as AttorneyProfileRecord
      : await createDb("attorney_profiles", {
          id: randomUUID(),
          userId: dbUser.id,
          licenseStatus: "PENDING",
          licenseState: licenseState || null,
          lawFirm: lawFirm || null,
          licenseDocumentPath: licenseDocumentPath || null,
          licenseDocumentName: licenseDocumentName || null,
          appliedAt: new Date().toISOString(),
        }) as AttorneyProfileRecord;

    // Add ATTORNEY role if not already present
    if (!dbUser.roles.includes("ATTORNEY")) {
      await updateDb("users", { id: dbUser.id }, {
        roles: [...dbUser.roles, "ATTORNEY"],
        updatedAt: new Date().toISOString(),
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
