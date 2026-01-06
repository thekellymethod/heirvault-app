import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cu = await currentUser();
  if (!cu?.id) return NextResponse.json({ error: "Missing Clerk user" }, { status: 400 });

  const email = cu.emailAddresses?.[0]?.emailAddress ?? null;

  const payload = {
    clerkId: cu.id,
    email: email ?? "",
    firstName: cu.firstName ?? null,
    lastName: cu.lastName ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("User")
    .upsert(payload, { onConflict: "clerkId" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
