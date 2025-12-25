import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAuth();
    const { id } = await params;

    const prismaInsurer = await prisma.insurers.findUnique({
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

    if (!prismaInsurer) {
      return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
    }

    const insurer = {
      id: prismaInsurer.id,
      name: prismaInsurer.name,
      contactPhone: prismaInsurer.contactPhone,
      contactEmail: prismaInsurer.contactEmail,
      website: prismaInsurer.website,
      createdAt: prismaInsurer.createdAt,
      updatedAt: prismaInsurer.updatedAt,
    };

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
    await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const contactPhone = (body?.contactPhone as string | undefined)?.trim() || null;
    const contactEmail = (body?.contactEmail as string | undefined)?.trim() || null;
    const website = (body?.website as string | undefined)?.trim() || null;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    // Check if insurer exists
    const exists = await prisma.insurers.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!exists) {
      return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
    }

    // Update insurer
    const updated = await prisma.insurers.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        contactPhone: contactPhone,
        contactEmail: contactEmail,
        website: website,
      },
    });

    return NextResponse.json({ ok: true, insurerId: updated.id }, { status: 200 });
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
    await requireAuth();
    const { id } = await params;

    // Check if insurer exists
    const exists = await prisma.insurers.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!exists) {
      return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
    }

    try {
      // NOTE: This will fail if policies reference the insurer (FK constraint).
      // That's good: it prevents accidental data loss. We surface the error cleanly.
      await prisma.insurers.delete({ where: { id } });
    } catch (prismaError: unknown) {
      const errorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
      const isFk = typeof errorMessage === "string" && errorMessage.toLowerCase().includes("foreign key");
      if (isFk) {
        return NextResponse.json(
          { error: "Cannot delete: insurer is referenced by one or more policies." },
          { status: 409 }
        );
      }
      throw prismaError;
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
