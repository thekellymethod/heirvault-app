import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { sendEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { userId, licenseStatus = "ACTIVE" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!["ACTIVE", "SUSPENDED", "REVOKED"].includes(licenseStatus)) {
      return NextResponse.json(
        { error: "Invalid license status" },
        { status: 400 }
      );
    }

    const { findUnique: findUniqueUser, update: updateProfile, update: updateUser } = await import("@/lib/db");
    
    // Get user details before updating
    type UserRecord = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      roles: string[];
      clerkId: string;
    };
    
    const user = await findUniqueUser<UserRecord>("users", { id: userId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update attorney profile
    type AttorneyProfileRecord = {
      id: string;
      licenseStatus: string;
      verifiedAt: string | null;
    };
    
    const updatedProfile = await updateProfile<AttorneyProfileRecord>("attorney_profiles", { userId }, {
      licenseStatus: licenseStatus as "ACTIVE" | "SUSPENDED" | "REVOKED",
      verifiedAt: licenseStatus === "ACTIVE" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    // Ensure user has ATTORNEY role
    if (!user.roles.includes("ATTORNEY")) {
      await updateUser("users", { id: userId }, {
        roles: [...user.roles, "ATTORNEY"],
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    // Write audit log
    await logAuditEvent({
      userId: userId,
      action: "ATTORNEY_VERIFIED",
      metadata: {
        email: user.email,
        licenseStatus,
      },
    });

    // Send approval email if status is ACTIVE
    if (licenseStatus === "ACTIVE") {
      try {
        const signInUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-in`;
        const attorneyName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
        
        await sendEmail({
          to: user.email,
          subject: "Your HeirVault Attorney Application Has Been Approved",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #111C33; margin-bottom: 20px;">Attorney Application Approved</h2>
              <p style="color: #253246; line-height: 1.6;">
                Dear ${attorneyName},
              </p>
              <p style="color: #253246; line-height: 1.6;">
                Your attorney application has been reviewed and <strong>approved</strong>. You now have full access to the HeirVault attorney dashboard.
              </p>
              <div style="background: #F7F9FC; border-left: 4px solid #C8942D; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #253246; font-weight: 600;">Your Login Information:</p>
                <p style="margin: 5px 0 0 0; color: #253246;">
                  <strong>Email:</strong> ${user.email}<br/>
                  <strong>Sign In:</strong> <a href="${signInUrl}" style="color: #C8942D;">${signInUrl}</a>
                </p>
              </div>
              <p style="color: #253246; line-height: 1.6;">
                You can now sign in using your email address. If you haven't set up your account yet, you'll be prompted to create a password during your first sign-in.
              </p>
              <p style="color: #253246; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              <hr style="border: none; border-top: 1px solid #D9E2EE; margin: 30px 0;" />
              <p style="color: #6B7280; font-size: 12px;">
                This is an automated message from HeirVault. Please do not reply to this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: "Attorney verification updated",
      profile: {
        id: (updatedProfile as AttorneyProfileRecord).id,
        licenseStatus: (updatedProfile as AttorneyProfileRecord).licenseStatus,
        verifiedAt: (updatedProfile as AttorneyProfileRecord).verifiedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Attorney verify error:", error);
    const message = error instanceof Error ? error.message : "Failed to verify attorney";
    const status = (error as { status?: number })?.status || 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    // Step A: Add diagnostic logging
    console.log("[ADMIN DASH DEBUG /api/admin/attorneys/verify]", {
      userId: admin.id,
      isAdmin: true,
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const { findMany: findManyProfiles, findUnique: findUniqueUser } = await import("@/lib/db");
    
    const where: Record<string, unknown> = {};
    if (status && (status === "ACTIVE" || status === "SUSPENDED" || status === "REVOKED" || status === "PENDING")) {
      where.licenseStatus = status;
    }

    type AttorneyProfileRecord = {
      id: string;
      userId: string;
      licenseStatus: string;
      licenseState: string | null;
      lawFirm: string | null;
      licenseDocumentPath: string | null;
      licenseDocumentName: string | null;
      appliedAt: string;
      verifiedAt: string | null;
    };
    
    const profiles = await findManyProfiles<AttorneyProfileRecord>("attorney_profiles", {
      where,
      orderBy: { column: "appliedAt", ascending: false },
    });
    
    // Step B: Add row-count logging after query
    console.log("[ADMIN DASH QUERY COUNTS /api/admin/attorneys/verify]", {
      profiles: profiles?.length ?? 0,
      statusFilter: status,
      whereClause: where,
    });

    // Fetch users for each profile
    const profilesWithUsers = await Promise.all(
      (profiles || []).map(async (profile) => {
        const user = await findUniqueUser<{
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          barNumber: string | null;
          phone: string | null;
        }>("users", { id: profile.userId });
        
        return {
          id: profile.id,
          userId: profile.userId,
          licenseStatus: profile.licenseStatus,
          licenseState: profile.licenseState,
          lawFirm: profile.lawFirm,
          licenseDocumentPath: profile.licenseDocumentPath,
          licenseDocumentName: profile.licenseDocumentName,
          appliedAt: typeof profile.appliedAt === 'string' ? profile.appliedAt : new Date(profile.appliedAt).toISOString(),
          verifiedAt: profile.verifiedAt ? (typeof profile.verifiedAt === 'string' ? profile.verifiedAt : new Date(profile.verifiedAt).toISOString()) : null,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            barNumber: user.barNumber,
            phone: user.phone,
          } : null,
        };
      })
    );

    return NextResponse.json({ profiles: profilesWithUsers.filter(p => p.user !== null) });
  } catch (error: unknown) {
    console.error("Attorney list error:", error);
    const message = error instanceof Error ? error.message : "Failed to list attorneys";
    const status = (error as { status?: number })?.status || 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

