import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "./database.types"

/**
 * Refreshes the Supabase session cookie on every matched request and gates the
 * /admin area. This is the first (coarse) line of defense: it only checks for a
 * logged-in Supabase user. The authoritative admin_users role check happens in
 * the server component layout at app/admin/(protected)/layout.tsx.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, never store this client in a global variable.
  // Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect every /admin route except the login page itself.
  const isAdminArea = pathname.startsWith("/admin")
  const isLoginPage = pathname === "/admin/login"

  if (isAdminArea && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: return the supabaseResponse object as-is so the browser and
  // server stay in sync and the session is not terminated prematurely.
  return supabaseResponse
}
