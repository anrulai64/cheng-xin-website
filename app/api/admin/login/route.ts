import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"
import { isAllowlistedAdmin } from "@/lib/admin/allowlist"

// Route handlers are always dynamic; never cache an auth endpoint.
export const dynamic = "force-dynamic"

type LoginResult = {
  ok: boolean
  code?:
    | "invalid_input"
    | "invalid_credentials"
    | "email_not_confirmed"
    | "rate_limited"
    | "not_admin"
    | "unexpected"
}

/**
 * POST /api/admin/login
 *
 * Standard Route Handler (not a Server Action) so the request survives Vercel
 * deployments without action-id mismatches.
 *
 * IMPORTANT (cookie persistence): a manually-constructed NextResponse does NOT
 * automatically inherit cookies written through `next/headers`. So we capture
 * every cookie Supabase wants to set during signInWithPassword and attach them
 * to the response we return. Without this the browser never stores the session
 * and the very next request to /admin sees `getUser() === null`.
 */
export async function POST(request: Request) {
  let email = ""
  let password = ""

  try {
    const body = await request.json()
    email = typeof body?.email === "string" ? body.email : ""
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    console.error("DEBUG_AUTH: could not parse JSON body")
    return NextResponse.json<LoginResult>({ ok: false, code: "invalid_input" }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password) {
    console.error("DEBUG_AUTH: missing email or password", {
      hasEmail: Boolean(cleanEmail),
      hasPassword: Boolean(password),
    })
    return NextResponse.json<LoginResult>({ ok: false, code: "invalid_input" }, { status: 400 })
  }

  const cookieStore = await cookies()

  // Collect the session cookies Supabase writes so we can flush them onto the
  // outgoing response (see the note above).
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options })
            try {
              cookieStore.set(name, value, options)
            } catch {
              // Ignore: we still attach these to the response below.
            }
          })
        },
      },
    },
  )

  // Build the JSON response and flush the captured session cookies onto it.
  function reply(result: LoginResult, status = 200) {
    const response = NextResponse.json<LoginResult>(result, { status })
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as never)
    })
    return response
  }

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (signInError) {
    console.error("DEBUG_AUTH: signInWithPassword failed", {
      email: cleanEmail,
      status: signInError.status,
      code: signInError.code,
      message: signInError.message,
    })

    const code = signInError.code ?? ""
    if (code === "email_not_confirmed") return reply({ ok: false, code: "email_not_confirmed" })
    if (code === "over_request_rate_limit" || signInError.status === 429)
      return reply({ ok: false, code: "rate_limited" })
    if (code === "invalid_credentials") return reply({ ok: false, code: "invalid_credentials" })
    return reply({ ok: false, code: "unexpected" })
  }

  const user = data.user
  console.error("DEBUG_AUTH: sign in OK", {
    userId: user?.id,
    userEmail: user?.email,
    emailConfirmedAt: user?.email_confirmed_at,
    hasSession: Boolean(data.session),
    cookiesWritten: pendingCookies.map((c) => c.name),
  })

  if (!user) {
    console.error("DEBUG_AUTH: no user object on session after sign in")
    return reply({ ok: false, code: "unexpected" })
  }

  // Allowlist escape hatch: an allowlisted email is granted admin immediately,
  // skipping the admin_users lookup (which RLS may block). Requires a valid
  // Supabase session — this does NOT bypass authentication.
  if (isAllowlistedAdmin(user.email)) {
    console.error("DEBUG_AUTH: admin granted via allowlist", { userEmail: user.email })
    return reply({ ok: true })
  }

  // Look the user up in admin_users by user_id OR email (case-insensitive).
  // NOTE: select only columns that exist on the live table (no `id`).
  const userEmail = user.email?.trim().toLowerCase()
  const filters = [`user_id.eq.${user.id}`]
  if (userEmail) filters.push(`email.ilike.${userEmail}`)

  const { data: rows, error: lookupError } = await supabase
    .from("admin_users")
    .select("user_id, email, role")
    .or(filters.join(","))

  console.error("DEBUG_AUTH: admin_users lookup", {
    filters,
    lookupError: lookupError
      ? { code: lookupError.code, message: lookupError.message, details: lookupError.details }
      : null,
    rowCount: rows?.length ?? 0,
    rows,
  })

  if (lookupError) {
    console.error("DEBUG_AUTH: lookup errored — likely RLS blocking SELECT on admin_users")
    await supabase.auth.signOut()
    return reply({ ok: false, code: "not_admin" })
  }

  if (!rows || rows.length === 0) {
    console.error("DEBUG_AUTH: no matching admin_users row for this user_id/email — denying")
    await supabase.auth.signOut()
    return reply({ ok: false, code: "not_admin" })
  }

  console.error("DEBUG_AUTH: admin granted", { matchedRow: rows[0] })
  return reply({ ok: true })
}

// Sync production deployment
