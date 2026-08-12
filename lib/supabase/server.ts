import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

/**
 * Supabase Server Client (Server Components, Route Handlers, Server Actions).
 *
 * Especially important with Fluid compute: don't put this client in a global
 * variable. Always create a new client within each function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Secure cookies in production; not in dev so localhost still works.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be safely ignored when session refresh is handled
            // elsewhere (e.g. middleware/proxy).
          }
        },
      },
    },
  )
}
