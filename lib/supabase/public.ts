import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

/**
 * Supabase PUBLIC ANONYMOUS Server Client.
 *
 * For public, unauthenticated read paths that must remain compatible with
 * static rendering / ISR (e.g. the CMS Article fallback branch of
 * `/blog/[slug]`). Unlike `lib/supabase/server.ts`, this client:
 *
 *   - does NOT call `cookies()` or `headers()` (no Next.js dynamic APIs)
 *   - does NOT read or persist any auth/session state
 *   - does NOT use `service_role` — only the public URL + publishable/anon key
 *   - is still fully subject to RLS (requests run as the `anon` role)
 *
 * `lib/supabase/server.ts` reads `cookies()` via `@supabase/ssr` to support
 * authenticated Admin requests. That's correct for the Admin app, but it
 * makes ANY route that imports it opt into Next.js's per-request dynamic
 * rendering, which is incompatible with a route that also serves prerendered
 * static params (like the six legacy `/blog/[slug]` paths sharing a route
 * file with the CMS fallback). This client has zero dynamic-API dependency,
 * so it never forces that opt-in.
 *
 * Use this for public content reads only. Continue using
 * `lib/supabase/server.ts` for anything that depends on the Admin session.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
