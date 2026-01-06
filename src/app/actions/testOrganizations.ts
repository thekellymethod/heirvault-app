"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // TEMP for debugging only
);

export async function testOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select("*");

  return { data, error };
}
