import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const {
      firstName,
      lastName,
      relationship,
      email,
      phone,
      dateOfBirth,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    // Check if beneficiary exists
    const existing = await prisma.beneficiaries.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    // Parse dateOfBirth if provided
    let parsedDateOfBirth: Date | null = null;
    if (dateOfBirth) {
      if (typeof dateOfBirth === 'string') {
        const [year, month, day] = dateOfBirth.split('-').map(Number);
        parsedDateOfBirth = new Date(year, month - 1, day);
      } else {
        parsedDateOfBirth = new Date(dateOfBirth);
      }
    }

    const updated = await prisma.beneficiaries.update({
      where: { id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        relationship: relationship?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        dateOfBirth: parsedDateOfBirth,
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update beneficiary" },
        { status: 500 }
      );
    }

    await logAuditEvent({
      action: "BENEFICIARY_UPDATED",
      resourceType: "beneficiary",
      resourceId: id,
      details: { 
        firstName, 
        lastName,
        clientId: updated.clientId,
      },
      userId: user.id,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update beneficiary";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Get beneficiary for audit before deleting
    const beneficiary = await prisma.beneficiaries.findUnique({
      where: { id },
      select: { id: true, clientId: true, firstName: true, lastName: true },
    });

    if (!beneficiary) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    await prisma.beneficiaries.delete({
      where: { id },
    });

    await logAuditEvent({
      action: "BENEFICIARY_UPDATED",
      resourceType: "beneficiary",
      resourceId: id,
      details: { 
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        clientId: beneficiary.clientId,
      },
      userId: user.id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete beneficiary";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

