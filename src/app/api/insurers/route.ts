import { NextRequest, NextResponse } from "next/server";
import { db, insurers, eq, asc } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";

export async function GET() {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const insurersList = await db.select()
      .from(insurers)
      .orderBy(asc(insurers.name));

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
  const { user } = authResult;

  try {
    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const contactPhone = (body?.contactPhone as string | undefined)?.trim() || null;
    const contactEmail = (body?.contactEmail as string | undefined)?.trim() || null;
    const website = (body?.website as string | undefined)?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const [newInsurer] = await db.insert(insurers)
      .values({
        name,
        contactPhone,
        contactEmail,
        website,
      })
      .returning();
    
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
