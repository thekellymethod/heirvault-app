import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;

    // Extract client ID from receipt ID format: REC-{clientId}-{timestamp}
    const match = receiptId.match(/^REC-([^-]+)-/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid receipt ID format" },
        { status: 400 }
      );
    }

    const clientId = match[1];

    // Find the most recent invite for this client
    const invite = await prisma.clientInvite.findFirst({
      where: {
        clientId,
        usedAt: { not: null }, // Only used invites
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Receipt not found. Please check your receipt ID and try again." },
        { status: 404 }
      );
    }

    // Return token for update access
    return NextResponse.json({
      token: invite.token,
      clientName: `${invite.client.firstName} ${invite.client.lastName}`,
    });
  } catch (error: any) {
    console.error("Error looking up receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

