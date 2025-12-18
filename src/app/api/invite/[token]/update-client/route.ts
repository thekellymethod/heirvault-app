import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { verifyConfirmationCode } from "../send-confirmation/route";
import { getOrCreateTestInvite } from "@/lib/test-invites";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { policies, beneficiaries, address } = body;
    
    // Get confirmation code from query or body
    const confirmationCode = body.confirmationCode || new URL(req.url).searchParams.get("code");
    const confirmationMethod = body.confirmationMethod || new URL(req.url).searchParams.get("method");

    // Verify confirmation code
    if (!confirmationCode || !confirmationMethod) {
      return NextResponse.json(
        { error: "Confirmation code is required" },
        { status: 400 }
      );
    }

    const isValid = verifyConfirmationCode(token, confirmationCode, confirmationMethod);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation code" },
        { status: 400 }
      );
    }

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    // Update address
    if (address) {
      await prisma.client.update({
        where: { id: invite.clientId },
        data: {
          addressLine1: address.street || null,
          city: address.city || null,
          state: address.state || null,
          postalCode: address.zipCode || null,
        },
      });
    }

    // Update policies
    if (policies && Array.isArray(policies)) {
      // Delete existing policies
      await prisma.policy.deleteMany({
        where: { clientId: invite.clientId },
      });

      // Create new policies
      for (const policy of policies) {
        if (policy.insurerName && policy.policyNumber) {
          // Find or create insurer
          let insurer = await prisma.insurer.findFirst({
            where: {
              name: {
                equals: policy.insurerName,
                mode: "insensitive",
              },
            },
          });

          if (!insurer) {
            insurer = await prisma.insurer.create({
              data: {
                name: policy.insurerName,
              },
            });
          }

          await prisma.policy.create({
            data: {
              clientId: invite.clientId,
              insurerId: insurer.id,
              policyNumber: policy.policyNumber || null,
              policyType: policy.policyType || null,
            },
          });
        }
      }
    }

    // Update beneficiaries
    if (beneficiaries && Array.isArray(beneficiaries)) {
      // Delete existing beneficiaries
      await prisma.beneficiary.deleteMany({
        where: { clientId: invite.clientId },
      });

      // Create new beneficiaries
      for (const beneficiary of beneficiaries) {
        if (beneficiary.firstName && beneficiary.lastName) {
          await prisma.beneficiary.create({
            data: {
              clientId: invite.clientId,
              firstName: beneficiary.firstName,
              lastName: beneficiary.lastName,
              relationship: beneficiary.relationship || null,
              percentage: beneficiary.percentage || 0,
            },
          });
        }
      }
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CLIENT_UPDATED,
        message: "Client information updated via update portal",
        clientId: invite.clientId,
        userId: null,
        orgId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Information updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

