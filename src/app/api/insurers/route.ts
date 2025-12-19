import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET() {
  try {
    await requireAuth("attorney");

    // Use raw SQL first for reliability
    let insurers: any[] = [];
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
        ORDER BY name ASC
      `;

      insurers = rawResult.map(row => ({
        id: row.id,
        name: row.name,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        website: row.website,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (sqlError: any) {
      console.error("Insurers GET: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        if ((prisma as any).insurers) {
          const prismaInsurers = await (prisma as any).insurers.findMany({
            orderBy: { name: "asc" },
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
          insurers = prismaInsurers.map((ins: any) => ({
            id: ins.id,
            name: ins.name,
            contactPhone: ins.contact_phone,
            contactEmail: ins.contact_email,
            website: ins.website,
            createdAt: ins.created_at,
            updatedAt: ins.updated_at,
          }));
        } else if ((prisma as any).insurer) {
          const prismaInsurers = await (prisma as any).insurer.findMany({
            orderBy: { name: "asc" },
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
          insurers = prismaInsurers;
        }
      } catch (prismaError: any) {
        console.error("Insurers GET: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    return NextResponse.json({ insurers }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth("attorney");

    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const contactPhone = (body?.contactPhone as string | undefined)?.trim() || null;
    const contactEmail = (body?.contactEmail as string | undefined)?.trim() || null;
    const website = (body?.website as string | undefined)?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Use raw SQL first for reliability
    let insurerId: string;
    try {
      const { randomUUID } = await import("crypto");
      insurerId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO insurers (id, name, contact_phone, contact_email, website, created_at, updated_at)
        VALUES (${insurerId}, ${name}, ${contactPhone}, ${contactEmail}, ${website}, NOW(), NOW())
      `;
    } catch (sqlError: any) {
      console.error("Insurers POST: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        if ((prisma as any).insurers) {
          const insurer = await (prisma as any).insurers.create({
            data: { 
              name, 
              contact_phone: contactPhone, 
              contact_email: contactEmail, 
              website 
            },
            select: { id: true },
          });
          insurerId = insurer.id;
        } else if ((prisma as any).insurer) {
          const insurer = await (prisma as any).insurer.create({
            data: { name, contactPhone, contactEmail, website },
            select: { id: true },
          });
          insurerId = insurer.id;
        } else {
          throw new Error("Neither insurers nor insurer model found");
        }
      } catch (prismaError: any) {
        console.error("Insurers POST: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    return NextResponse.json({ ok: true, insurerId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
