import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";

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

    const [user] = await db
      .insert(users)
      .values({
        clerkId: userId,
        email,
        firstName,
        lastName,
        role: "attorney",
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          firstName,
          lastName,
          role: "attorney",
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id, clerkId: users.clerkId, role: users.role, email: users.email });

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
