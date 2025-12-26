import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const cu = await currentUser();
    if (!cu) {
      return NextResponse.json(
        { ok: false, error: "No current user found" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email =
      cu?.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
      cu?.emailAddresses?.[0]?.emailAddress ??
      null;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "No email found for current user" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const firstName = cu?.firstName ?? null;
    const lastName = cu?.lastName ?? null;

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email,
        firstName,
        lastName,
        role: "attorney",
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        clerkId: userId,
        email,
        firstName,
        lastName,
        role: "attorney",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Failed to create or update user" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, user },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
