import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

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

    // Get user details before updating
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        clerkId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get attorney profile
    const profile = await prisma.attorneyProfile.findUnique({
      where: { userId },
      select: { lawFirm: true },
    });

    // Update attorney profile
    const updatedProfile = await prisma.attorneyProfile.update({
      where: { userId },
      data: {
        licenseStatus: licenseStatus as "ACTIVE" | "SUSPENDED" | "REVOKED",
        verifiedAt: licenseStatus === "ACTIVE" ? new Date() : null,
      },
    });

    // Ensure user has ATTORNEY role
    if (!user.roles.includes("ATTORNEY")) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          roles: [...user.roles, "ATTORNEY"],
        },
      });
    }

    // Write audit log
    await audit("ATTORNEY_VERIFIED", {
      userId: userId,
      message: `Attorney verified: ${user.email} | Status: ${licenseStatus}`,
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
        id: updatedProfile.id,
        licenseStatus: updatedProfile.licenseStatus,
        verifiedAt: updatedProfile.verifiedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Attorney verify error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify attorney" },
      { status: error.status || 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: { licenseStatus?: string } = {};
    if (status) {
      where.licenseStatus = status;
    }

    const profiles = await prisma.attorneyProfile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        licenseStatus: true,
        licenseState: true,
        lawFirm: true,
        licenseDocumentPath: true,
        licenseDocumentName: true,
        appliedAt: true,
        verifiedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            barNumber: true,
            phone: true,
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    });

    return NextResponse.json({ profiles });
  } catch (error: unknown) {
    console.error("Attorney list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list attorneys" },
      { status: error.status || 500 }
    );
  }
}

