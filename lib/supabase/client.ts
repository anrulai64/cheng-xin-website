import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

/**
 * Supabase Browser Client (client components).
 *
 * Uses the public, publishable env vars only. No credentials are hardcoded.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Secure cookies in production; not in dev so localhost still works.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    },
  )
}
