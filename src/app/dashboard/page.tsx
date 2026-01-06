import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { getToken, userId } = await auth();

  // ✅ THIS LINE IS THE CRITICAL PART
  const token = await getToken({ template: "supabase" });

  const supabase = createServerClient({ token });

  const { data, error } = await supabase
    .from("organizations")
    .select("*");

  return (
    <pre>
      {JSON.stringify(
        {
          userId,
          tokenPresent: Boolean(token),
          data,
          error,
        },
        null,
        2
      )}
    </pre>
  );
}
