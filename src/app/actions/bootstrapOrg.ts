"use server";

import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function bootstrapOrg() {
  const { getToken, userId } = await auth();
  if (!userId) return { data: null, error: "Not authenticated" };

  const token = await getToken({ template: "supabase" });
  if (!token) return { data: null, error: "Missing Clerk supabase token" };

  const supabase = createServerClient({ token });

  // 1) Do we already have an org for this owner?
  const existing = await supabase
    .from("organizations")
    .select("id, name, slug, owner_user_id, billing_plan, billing_status")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing.error) return { data: null, error: existing.error.message };
  if (existing.data) return { data: existing.data, error: null };

  // 2) Create one
  const name = "My Organization";
  const slug = slugify(`${name}-${userId}`);

  const inserted = await supabase
    .from("organizations")
    .insert({
      id: crypto.randomUUID(),
      name,
      slug,
      owner_user_id: userId,
      billing_plan: "FREE",
      billing_status: "inactive",
    })
    .select("id, name, slug, owner_user_id, billing_plan, billing_status")
    .single();

  if (inserted.error) return { data: null, error: inserted.error.message };

  // 3) Optional: add owner as org member
  await supabase.from("org_members").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    organization_id: inserted.data.id,
    role: "OWNER",
  });

  return { data: inserted.data, error: null };
}
