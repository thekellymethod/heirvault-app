import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth("attorney");
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

    // Use raw SQL first for reliability
    let updated: any = null;
    try {
      // Check if beneficiary exists
      const existsResult = await prisma.$queryRaw<Array<{ id: string; client_id: string }>>`
        SELECT id, client_id FROM beneficiaries WHERE id = ${id} LIMIT 1
      `;

      if (!existsResult || existsResult.length === 0) {
        return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
      }

      const clientId = existsResult[0].client_id;

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

      // Update beneficiary using raw SQL
      await prisma.$executeRaw`
        UPDATE beneficiaries
        SET 
          first_name = ${firstName.trim()},
          last_name = ${lastName.trim()},
          relationship = ${relationship?.trim() || null},
          email = ${email?.trim() || null},
          phone = ${phone?.trim() || null},
          date_of_birth = ${parsedDateOfBirth},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Fetch updated beneficiary
      const updatedResult = await prisma.$queryRaw<Array<{
        id: string;
        client_id: string;
        first_name: string;
        last_name: string;
        relationship: string | null;
        email: string | null;
        phone: string | null;
        date_of_birth: Date | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT 
          id, client_id, first_name, last_name, relationship, 
          email, phone, date_of_birth, created_at, updated_at
        FROM beneficiaries
        WHERE id = ${id}
      `;

      if (updatedResult && updatedResult.length > 0) {
        const row = updatedResult[0];
        updated = {
          id: row.id,
          clientId: row.client_id,
          firstName: row.first_name,
          lastName: row.last_name,
          relationship: row.relationship,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.date_of_birth,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    } catch (sqlError: any) {
      console.error("Beneficiary update: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
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

        updated = await prisma.beneficiary.update({
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
      } catch (prismaError: any) {
        console.error("Beneficiary update: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update beneficiary" },
        { status: 500 }
      );
    }

    await logAuditEvent({
      action: "BENEFICIARY_UPDATED",
      message: `Updated beneficiary ${id}: ${firstName} ${lastName}`,
      userId: user.id,
      clientId: updated.clientId,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to update beneficiary" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth("attorney");
    const { id } = await params;

    // Use raw SQL first for reliability
    try {
      // Check if beneficiary exists and get clientId for audit
      const existsResult = await prisma.$queryRaw<Array<{ id: string; client_id: string; first_name: string; last_name: string }>>`
        SELECT id, client_id, first_name, last_name FROM beneficiaries WHERE id = ${id} LIMIT 1
      `;

      if (!existsResult || existsResult.length === 0) {
        return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
      }

      const beneficiary = existsResult[0];
      const clientId = beneficiary.client_id;

      // Delete beneficiary (cascade deletes will handle policy_beneficiaries)
      await prisma.$executeRaw`DELETE FROM beneficiaries WHERE id = ${id}`;

      await logAuditEvent({
        action: "BENEFICIARY_UPDATED", // Using BENEFICIARY_UPDATED as there's no BENEFICIARY_DELETED action
        message: `Deleted beneficiary ${id}: ${beneficiary.first_name} ${beneficiary.last_name}`,
        userId: user.id,
        clientId,
      });

      return new NextResponse(null, { status: 204 });
    } catch (sqlError: any) {
      console.error("Beneficiary delete: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        // Get beneficiary for audit before deleting
        const beneficiary = await prisma.beneficiary.findUnique({
          where: { id },
          select: { id: true, clientId: true, firstName: true, lastName: true },
        });

        if (!beneficiary) {
          return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
        }

        await prisma.beneficiary.delete({
          where: { id },
        });

        await logAuditEvent({
          action: "BENEFICIARY_UPDATED",
          message: `Deleted beneficiary ${id}: ${beneficiary.firstName} ${beneficiary.lastName}`,
          userId: user.id,
          clientId: beneficiary.clientId,
        });

        return new NextResponse(null, { status: 204 });
      } catch (prismaError: any) {
        console.error("Beneficiary delete: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to delete beneficiary" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

