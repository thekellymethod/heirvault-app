import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");

    // Get all clients the attorney has access to
    const access = await prisma.attorneyClientAccess.findMany({
      where: {
        attorneyId: user.id,
        isActive: true,
      },
      select: {
        clientId: true,
      },
    });

    const clientIds = access.map((a) => a.clientId);

    if (clientIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get all beneficiaries for these clients
    const beneficiaries = await prisma.beneficiary.findMany({
      where: {
        clientId: {
          in: clientIds,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(beneficiaries);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to fetch beneficiaries" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");
    const body = await req.json();

    const {
      clientId,
      firstName,
      lastName,
      relationship,
      email,
      phone,
      dateOfBirth,
    } = body;

    if (!clientId || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        attorneyId: user.id,
        clientId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        clientId,
        firstName,
        lastName,
        relationship: relationship || null,
        email: email ?? null,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    await logAuditEvent({
      action: "BENEFICIARY_CREATED",
      message: "Beneficiary created",
      userId: user.id,
      clientId,
    });

    return NextResponse.json(beneficiary, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to create beneficiary" },
      { status: 400 }
    );
  }
}
