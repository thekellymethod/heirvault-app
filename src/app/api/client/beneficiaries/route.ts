import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET() {
  try {
    const user = await requireAuth("client");

    const client = await prisma.client.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        relationship: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ beneficiaries }, { status: 200 });
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
    const user = await requireAuth("client");
    const body = await req.json();

    const client = await prisma.client.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    const firstName = (body?.firstName as string | undefined)?.trim();
    const lastName = (body?.lastName as string | undefined)?.trim();
    const relationship = (body?.relationship as string | undefined)?.trim() || null;
    const email = (body?.email as string | undefined)?.trim() || null;
    const phone = (body?.phone as string | undefined)?.trim() || null;
    const dateOfBirth = (body?.dateOfBirth as string | undefined) || null;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        clientId: client.id,
        firstName,
        lastName,
        relationship,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, beneficiaryId: beneficiary.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
