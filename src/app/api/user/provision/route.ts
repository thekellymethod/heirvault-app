import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const cu = await currentUser();

    const email =
      cu?.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
      cu?.emailAddresses?.[0]?.emailAddress ??
      null;

    const firstName = cu?.firstName ?? null;
    const lastName = cu?.lastName ?? null;

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email,
        firstName,
        lastName,
        role: "attorney",
      },
      create: {
        clerkId: userId,
        email,
        firstName,
        lastName,
        role: "attorney",
      },
      select: { id: true, clerkId: true, role: true, email: true },
    });

    return NextResponse.json(
      { ok: true, user },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
