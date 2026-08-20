import "server-only"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAllowlistedAdmin } from "@/lib/admin/allowlist"

export type AdminUser = {
  id: string
  email: string
  role: string
}

/**
 * Returns the current admin user, or null if the visitor is not signed in or
 * has no matching row in `admin_users`. Never throws — safe to call from any
 * server component / route handler.
 *
 * Authoritative role check: it is NOT enough for the visitor to have a Supabase
 * session; they must also have a row in public.admin_users keyed by their
 * auth user id.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Allowlist escape hatch: grant admin without an admin_users lookup when the
  // signed-in email is allowlisted (keeps the gate consistent with the login
  // route when RLS blocks the table SELECT).
  if (isAllowlistedAdmin(user.email)) {
    return {
      id: user.id,
      email: user.email ?? "",
      role: "admin",
    }
  }

  // Match by auth user id OR by verified email. Matching on email as well makes
  // the check resilient when an admin_users row was provisioned before the auth
  // account existed (so its user_id is null / a placeholder / a different UUID).
  const email = user.email?.trim().toLowerCase()
  const filters = [`user_id.eq.${user.id}`]
  if (email) filters.push(`email.ilike.${email}`)

  // NOTE: select only columns that exist on the live table (no `id`).
  const { data: rows, error } = await supabase
    .from("admin_users")
    .select("user_id, email, role")
    .or(filters.join(","))
    .limit(1)

  if (error || !rows || rows.length === 0) return null

  const adminRow = rows[0]

  return {
    id: adminRow.user_id ?? user.id,
    email: adminRow.email ?? user.email ?? "",
    role: adminRow.role ?? "admin",
  }
}

/**
 * Guard for protected admin server components. Redirects to the login page when
 * the visitor is not a verified admin, otherwise returns the admin record.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) {
    redirect("/admin/login")
  }
  return admin
}
