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
  
  let data: unknown[] = [];
  let error: unknown = null;

  if (adminStatus) {
    // Admin users: use admin client to bypass RLS and see all organizations
    const db = getDb();
    const result = await db.from("organizations").select("*");
    data = result.data || [];
    error = result.error;
  } else {
    // Regular users: use regular client with RLS
    const supabase = createServerClient({ token });
    const result = await supabase.from("organizations").select("*");
    data = result.data || [];
    error = result.error;
  }

  return (
    <pre>
      {JSON.stringify(
        {
          userId,
          tokenPresent: Boolean(token),
          isAdmin: adminStatus,
          data,
          error,
        },
        null,
        2
      )}
    </pre>
  );
}
