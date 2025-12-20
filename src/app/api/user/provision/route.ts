import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

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

    // Check if user exists
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    let user;
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db.update(users)
        .set({
          email,
          firstName,
          lastName,
          role: "attorney",
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId))
        .returning({
          id: users.id,
          clerkId: users.clerkId,
          role: users.role,
          email: users.email,
        });
      user = updatedUser;
    } else {
      // Create new user
      const [newUser] = await db.insert(users)
        .values({
          clerkId: userId,
          email,
          firstName,
          lastName,
          role: "attorney",
        })
        .returning({
          id: users.id,
          clerkId: users.clerkId,
          role: users.role,
          email: users.email,
        });
      user = newUser;
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "Failed to create or update user" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, user },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
