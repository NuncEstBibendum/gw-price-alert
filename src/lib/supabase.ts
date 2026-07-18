import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from
// client components — it bypasses row-level security by design, since the
// dashboard reads/writes exclusively through Server Components / Server
// Actions / route handlers.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
