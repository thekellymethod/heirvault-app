import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type CreateServerClientArgs = {
  token?: string | null;
};

export function createServerClient({ token }: CreateServerClientArgs = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseClient(url, anon, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
