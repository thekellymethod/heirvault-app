import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET() {
  try {
    await requireAuth("attorney");

    const insurers = await prisma.insurer.findMany({
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

    const insurer = await prisma.insurer.create({
      data: { name, contactPhone, contactEmail, website },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, insurerId: insurer.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
