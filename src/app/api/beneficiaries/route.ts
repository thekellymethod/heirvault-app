import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

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

    if (!clientId || !firstName || !lastName || !relationship) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
        relationship,
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
