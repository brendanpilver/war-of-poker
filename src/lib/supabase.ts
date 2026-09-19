import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * The server-side Supabase client.
 *
 * Uses the service-role key, so it must only ever be called from route handlers
 * and server components -- never from a client component. Row Level Security is
 * enabled on every table (see `supabase/migrations/`) and denies anonymous
 * access outright; this key is the only path in, which keeps write authority on
 * the server where purchase state can be verified.
 *
 * Returns `null` when Supabase is unconfigured so the site still builds and runs
 * before the owner has provisioned it. Callers degrade rather than throw.
 */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const { supabaseUrl, supabaseServiceRoleKey } = env;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  cached ??= createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
