// src/app/api/invites/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const token = await getToken({ template: "supabase" });
  if (!token) {
    return json(
      { error: "Missing Clerk Supabase JWT (template: supabase)" },
      401
    );
  }

  const supabase = createServerClient({ token });

  let body: {
    org_id: string;
    email: string;
    role?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.org_id || !body.email) {
    return json({ error: "org_id and email are required" }, 400);
  }

  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      org_id: body.org_id,
      email: body.email.toLowerCase(),
      role: body.role ?? "member",
      invited_by: userId, // Clerk `sub`
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return json(
      {
        error: "Invite creation failed",
        details: error.message,
      },
      400
    );
  }

  return json({ invite: data });
}

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const token = await getToken({ template: "supabase" });
  if (!token) return json({ error: "Missing Clerk Supabase JWT" }, 401);

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return json({ error: "org_id required" }, 400);

  const supabase = createServerClient({ token });

  const { data, error } = await supabase
    .from("org_invites")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return json(
      {
        error: "Failed to fetch invites",
        details: error.message,
      },
      400
    );
  }

  return json({ invites: data });
}
