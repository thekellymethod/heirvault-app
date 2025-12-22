import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { uploadDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if user already has an attorney profile
    const existingProfile = await prisma.attorneyProfile.findUnique({
      where: { userId: user.id },
    });

    // If profile exists and is not PENDING, don't allow resubmission
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

    // Parse form data
    const formData = await req.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
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
      } catch (uploadError: any) {
        console.error("License document upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload license document: ${uploadError.message}` },
          { status: 400 }
        );
      }
    }

    // Update user with demographic information
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        firstName,
        lastName,
        phone: phone || undefined,
        barNumber,
      },
    });

    // Create or update attorney profile with PENDING status
    const profile = existingProfile
      ? await prisma.attorneyProfile.update({
          where: { userId: user.id },
          data: {
            licenseStatus: "PENDING",
            lawFirm: lawFirm || undefined,
            licenseDocumentPath: licenseDocumentPath || undefined,
            licenseDocumentName: licenseDocumentName || undefined,
            appliedAt: new Date(), // Update application timestamp
          },
        })
      : await prisma.attorneyProfile.create({
          data: {
            userId: user.id,
            licenseStatus: "PENDING",
            lawFirm: lawFirm || undefined,
            licenseDocumentPath: licenseDocumentPath || undefined,
            licenseDocumentName: licenseDocumentName || undefined,
          },
        });

    // Add ATTORNEY role if not already present
    if (!user.roles.includes("ATTORNEY")) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          roles: [...user.roles, "ATTORNEY"],
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
  } catch (error: any) {
    console.error("Attorney apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit attorney application" },
      { status: error.status || 500 }
    );
  }
}
