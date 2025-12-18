import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: {
        client: {
          include: {
            policies: {
              include: {
                insurer: true,
              },
            },
            beneficiaries: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: invite.client.email,
      phone: invite.client.phone,
      policies: invite.client.policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        insurerName: p.insurer.name,
        policyType: p.policyType,
      })),
      beneficiaries: invite.client.beneficiaries.map((b) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        relationship: b.relationship,
        percentage: b.percentage,
      })),
      address: {
        street: invite.client.addressLine1 || "",
        city: invite.client.city || "",
        state: invite.client.state || "",
        zipCode: invite.client.postalCode || "",
      },
    });
  } catch (error: any) {
    console.error("Error fetching client data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

