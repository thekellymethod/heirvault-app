import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { randomUUID } from "crypto";

export async function GET() {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;

  try {
    const insurersList = await prisma.insurers.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ insurers: insurersList }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;

  try {
    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const contactPhone = (body?.contactPhone as string | undefined)?.trim() || null;
    const contactEmail = (body?.contactEmail as string | undefined)?.trim() || null;
    const website = (body?.website as string | undefined)?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const newInsurerId = randomUUID();
    const now = new Date();
    const newInsurer = await prisma.insurers.create({
      data: {
        id: newInsurerId,
        name,
        contactPhone: contactPhone,
        contactEmail: contactEmail,
        website,
        createdAt: now,
        updatedAt: now,
      },
    });
    
    const insurerId = newInsurer.id;

    return NextResponse.json({ ok: true, insurerId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
