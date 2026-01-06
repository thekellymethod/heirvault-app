// src/app/api/invites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { createServerClient } from "@/lib/supabase/server";

// Minimal, pre-launch invite API:
// - NO prisma
// - NO audit/sec/fingerprint libs
// - Uses Clerk JWT (template: "supabase") attached as Bearer token
// - Relies on Supabase RLS for authorization

type InviteCreateBody = {
  orgId: string;
  email: string;
  role?: string; // e.g. "admin" | "member" | "attorney"
  expiresInDays?: number; // optional
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  // good-enough prelaunch validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const token = await getToken({ template: "supabase" });
  if (!token) {
    // This is the classic “JWT not present / not configured” state
    return json(
      {
        error:
          "Missing Clerk Supabase token. Verify JWT template name 'supabase' and Supabase Third-Party Auth/JWKS configuration.",
      },
      401
    );
  }

  let body: InviteCreateBody;
  try {
    body = (await req.json()) as InviteCreateBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const orgId = (body.orgId || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const role = (body.role || "member").trim();
  const expiresInDays = Number.isFinite(body.expiresInDays)
    ? Math.max(1, Math.min(90, body.expiresInDays!))
    : 14;

  if (!orgId) return json({ error: "orgId is required" }, 400);
  if (!email || !isEmail(email)) return json({ error: "Valid email is required" }, 400);

  // Generate an invite token you can email later.
  // (You can swap this to a signed JWT later; prelaunch a random token is fine.)
  const inviteToken = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const supabase = createServerClient({ token });

  /**
   * EXPECTED TABLE (adjust if your schema uses a different name):
   *
   * public.org_invites
   *  - id (uuid/text) [optional]
   *  - org_id (text/uuid)
   *  - email (text)
   *  - role (text)
   *  - token (text)
   *  - status (text) default 'pending'
   *  - expires_at (timestamptz)
   *  - created_at (timestamptz) default now()
   *  - invited_by (text)  // Clerk user id (sub)
   *
   * If your columns differ, change the insert payload below accordingly.
   */
  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      org_id: orgId,
      email,
      role,
      token: inviteToken,
      status: "pending",
      expires_at: expiresAt,
      invited_by: userId, // Clerk userId (sub)
    })
    .select("*")
    .single();

  if (error) {
    return json(
      {
        error: "Failed to create invite",
        details: error.message,
        code: (error as any).code,
        hint: (error as any).hint,
      },
      400
    );
  }

  // Prelaunch: return token so you can test end-to-end without email sending.
  // Later: remove token from response and email it instead.
  return json({ invite: data });
}

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const token = await getToken({ template: "supabase" });
  if (!token) return json({ error: "Missing Clerk Supabase token" }, 401);

  const { searchParams } = new URL(req.url);
  const orgId = (searchParams.get("orgId") || "").trim();
  if (!orgId) return json({ error: "orgId query param is required" }, 400);

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
        code: (error as any).code,
      },
      400
    );
  }

  return json({ invites: data });
}
