import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAuth("attorney");
    const { id } = await params;

    // Use raw SQL first for reliability
    let insurer: {
      id: string;
      name: string;
      contactPhone: string | null;
      contactEmail: string | null;
      website: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;
    try {
      const rawResult = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        contact_phone: string | null;
        contact_email: string | null;
        website: string | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT id, name, contact_phone, contact_email, website, created_at, updated_at
        FROM insurers
        WHERE id = ${id}
        LIMIT 1
      `;

      if (rawResult && rawResult.length > 0) {
        const row = rawResult[0];
        insurer = {
          id: row.id,
          name: row.name,
          contactPhone: row.contact_phone,
          contactEmail: row.contact_email,
          website: row.website,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Insurers GET [id]: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      // Fallback to Prisma
      try {
        const prismaAny = prisma as unknown as Record<string, unknown>;
        if (prismaAny.insurers && typeof prismaAny.insurers === "object") {
          const insurers = prismaAny.insurers as { findUnique: (args: { where: { id: string }; select: unknown }) => Promise<unknown> };
          const prismaInsurer = await insurers.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              contact_phone: true,
              contact_email: true,
              website: true,
              created_at: true,
              updated_at: true,
            },
          });
          if (prismaInsurer) {
            insurer = {
              id: prismaInsurer.id,
              name: prismaInsurer.name,
              contactPhone: prismaInsurer.contact_phone,
              contactEmail: prismaInsurer.contact_email,
              website: prismaInsurer.website,
              createdAt: prismaInsurer.created_at,
              updatedAt: prismaInsurer.updated_at,
            };
          }
        } else if (prismaAny.insurer && typeof prismaAny.insurer === "object") {
          const insurerModel = prismaAny.insurer as { findUnique: (args: { where: { id: string }; select: unknown }) => Promise<unknown> };
          const insurerResult = await insurerModel.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              contactPhone: true,
              contactEmail: true,
              website: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          insurer = insurerResult as typeof insurer;
        }
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Insurers GET [id]: Prisma also failed:", prismaErrorMessage);
        throw prismaError;
      }
    }

    if (!insurer) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
    return NextResponse.json({ insurer }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireAuth("attorney");
    const { id } = await params;

    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const contactPhone = (body?.contactPhone as string | undefined)?.trim() || null;
    const contactEmail = (body?.contactEmail as string | undefined)?.trim() || null;
    const website = (body?.website as string | undefined)?.trim() || null;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    // Check if insurer exists and update - use raw SQL first
    try {
      const existsResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM insurers WHERE id = ${id} LIMIT 1
      `;
      
      if (!existsResult || existsResult.length === 0) {
        return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: Array<string | null> = [];
      
      if (name !== undefined) {
        updates.push(`name = $${values.length + 1}`);
        values.push(name);
      }
      if (contactPhone !== undefined) {
        updates.push(`contact_phone = $${values.length + 1}`);
        values.push(contactPhone);
      }
      if (contactEmail !== undefined) {
        updates.push(`contact_email = $${values.length + 1}`);
        values.push(contactEmail);
      }
      if (website !== undefined) {
        updates.push(`website = $${values.length + 1}`);
        values.push(website);
      }
      
      updates.push(`updated_at = NOW()`);
      
      if (updates.length > 1) {
        await prisma.$executeRawUnsafe(
          `UPDATE insurers SET ${updates.join(', ')} WHERE id = $${values.length + 1}`,
          ...values,
          id
        );
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Insurers PATCH: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      // Fallback to Prisma
      try {
        if ((prisma as any).insurers) {
          const exists = await (prisma as any).insurers.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!exists) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });

          const updated = await (prisma as any).insurers.update({
            where: { id },
            data: {
              ...(name !== undefined ? { name } : {}),
              contact_phone: contactPhone,
              contact_email: contactEmail,
              website: website,
            },
            select: { id: true },
          });
          return NextResponse.json({ ok: true, insurerId: updated.id }, { status: 200 });
        } else if ((prisma as any).insurer) {
          const exists = await (prisma as any).insurer.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!exists) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });

          const updated = await insurerModel.update({
            where: { id },
            data: {
              ...(name !== undefined ? { name } : {}),
              contactPhone,
              contactEmail,
              website,
            },
            select: { id: true },
          });
          const updatedAny = updated as { id: string };
          return NextResponse.json({ ok: true, insurerId: updatedAny.id }, { status: 200 });
        }
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Insurers PATCH: Prisma also failed:", prismaErrorMessage);
        throw prismaError;
      }
    }

    return NextResponse.json({ ok: true, insurerId: id }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAuth("attorney");
    const { id } = await params;

    // Check if insurer exists and delete - use raw SQL first
    try {
      const existsResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM insurers WHERE id = ${id} LIMIT 1
      `;
      
      if (!existsResult || existsResult.length === 0) {
        return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
      }

      // NOTE: This will fail if policies reference the insurer (FK constraint).
      // That's good: it prevents accidental data loss. We surface the error cleanly.
      await prisma.$executeRaw`DELETE FROM insurers WHERE id = ${id}`;
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      const isFk = typeof errorMessage === "string" && errorMessage.toLowerCase().includes("foreign key");
      if (isFk) {
        return NextResponse.json(
          { error: "Cannot delete: insurer is referenced by one or more policies." },
          { status: 409 }
        );
      }
      
      console.error("Insurers DELETE: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        const prismaAny = prisma as unknown as Record<string, unknown>;
        if (prismaAny.insurers && typeof prismaAny.insurers === "object") {
          const insurers = prismaAny.insurers as { findUnique: (args: { where: { id: string }; select: unknown }) => Promise<unknown>; delete: (args: { where: { id: string } }) => Promise<unknown> };
          const exists = await insurers.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!exists) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });

          await insurers.delete({ where: { id } });
        } else if (prismaAny.insurer && typeof prismaAny.insurer === "object") {
          const insurerModel = prismaAny.insurer as { findUnique: (args: { where: { id: string }; select: unknown }) => Promise<unknown>; delete: (args: { where: { id: string } }) => Promise<unknown> };
          const exists = await insurerModel.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!exists) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });

          await insurerModel.delete({ where: { id } });
        }
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Insurers DELETE: Prisma also failed:", prismaErrorMessage);
        const errorMessage = prismaErrorMessage;
        const isFk = typeof errorMessage === "string" && errorMessage.toLowerCase().includes("foreign key");
        return NextResponse.json(
          { error: isFk ? "Cannot delete: insurer is referenced by one or more policies." : errorMessage },
          { status: isFk ? 409 : 400 }
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    const isFk = typeof message === "string" && message.toLowerCase().includes("foreign key");
    return NextResponse.json(
      { error: isFk ? "Cannot delete: insurer is referenced by one or more policies." : message },
      { status: isFk ? 409 : 400 }
    );
  }
}
