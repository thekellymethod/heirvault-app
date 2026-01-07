import { NextRequest, NextResponse } from "next/server";
;
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
    const { findUnique } = await import("@/lib/db");
    const existing = await findUnique("beneficiaries", { id });

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

    const { update: updateDb } = await import("@/lib/db");
    const updated = await updateDb("beneficiaries", { id }, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      relationship: relationship?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      dateOfBirth: parsedDateOfBirth ? parsedDateOfBirth.toISOString() : null,
      updatedAt: new Date().toISOString(),
    } as any);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update beneficiary" },
        { status: 500 }
      );
    }

    const { AuditAction } = await import("@/lib/db/enums");
    await logAuditEvent({
      action: AuditAction.BENEFICIARY_UPDATED,
      userId: user.id,
      clientId: (updated as any).clientId,
      metadata: { 
        beneficiaryId: id,
        firstName, 
        lastName,
      },
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
    const { findUnique, deleteRecord } = await import("@/lib/db");
    const { AuditAction } = await import("@/lib/db/enums");
    
    const beneficiary = await findUnique("beneficiaries", { id });

    if (!beneficiary) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    await deleteRecord("beneficiaries", { id });

    await logAuditEvent({
      action: AuditAction.BENEFICIARY_DELETED,
      userId: user.id,
      clientId: (beneficiary as any).clientId,
      metadata: { 
        beneficiaryId: id,
        firstName: (beneficiary as any).firstName,
        lastName: (beneficiary as any).lastName,
      },
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

