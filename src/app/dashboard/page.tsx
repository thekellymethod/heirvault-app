import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export default async function DashboardPage() {
  const { getToken, userId } = await auth();

  // ✅ THIS LINE IS THE CRITICAL PART
  const token = await getToken({ template: "supabase" });

  // Check if user is admin - admins should use admin client to bypass RLS
  const adminStatus = await isAdmin();
  
  // Get org context for diagnostic logging
  let orgId: string | null = null;
  let orgMember: unknown = null;
  let hasOrgMember = false;
  
  try {
    const { getCurrentUserWithOrg } = await import("@/lib/authz");
    const { user, orgMember: member } = await getCurrentUserWithOrg();
    orgMember = member;
    hasOrgMember = !!member;
    // ✅ OrgMemberRecord uses snake_case: organization_id (from database)
    orgId = member?.organization_id ?? null;
    
    // Step A: Add brutal diagnostic logging
    console.log("[ADMIN DASH DEBUG]", {
      userId: user?.id,
      clerkUserId: userId,
      isAdmin: adminStatus,
      orgId,
      hasOrgMember,
      orgMemberKeys: member ? Object.keys(member) : [],
    });
  } catch (err) {
    console.error("[ADMIN DASH DEBUG] Error getting org context:", err);
  }
  
  let data: unknown[] = [];
  let error: unknown = null;
  let queryCount = 0;

  if (adminStatus) {
    // Admin users: use admin client to bypass RLS and see all organizations
    const db = getDb();
    const result = await db.from("organizations").select("*");
    data = result.data || [];
    error = result.error;
    queryCount = Array.isArray(data) ? data.length : 0;
    
    // Step B: Add row-count logging after query
    console.log("[ADMIN DASH QUERY COUNTS]", {
      organizations: queryCount,
      orgId,
      hasOrgMember,
    });
  } else {
    // Regular users: use regular client with RLS
    const supabase = createServerClient({ token });
    const result = await supabase.from("organizations").select("*");
    data = result.data || [];
    error = result.error;
    queryCount = Array.isArray(data) ? data.length : 0;
    
    // Step B: Add row-count logging after query
    console.log("[ADMIN DASH QUERY COUNTS]", {
      organizations: queryCount,
      orgId,
      hasOrgMember,
    });
  }

  return (
    <pre>
      {JSON.stringify(
        {
          userId,
          tokenPresent: Boolean(token),
          isAdmin: adminStatus,
          orgId,
          hasOrgMember,
          queryCount,
          data,
          error,
        },
        null,
        2
      )}
    </pre>
  );
}
