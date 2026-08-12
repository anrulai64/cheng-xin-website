/**
 * Admin email allowlist.
 *
 * A signed-in Supabase user whose email is on this list is treated as a full
 * admin WITHOUT any admin_users table lookup. This is the escape hatch for when
 * RLS on public.admin_users blocks the authenticated SELECT (the current issue:
 * auth succeeds, but the table query returns zero rows).
 *
 * Configure additional emails without a redeploy via the ADMIN_EMAIL_ALLOWLIST
 * environment variable (comma-separated). The owner email is included by
 * default so login keeps working out of the box.
 */
const DEFAULT_ALLOWLIST = ["yishanwu409@gmail.com"]

export function getAdminAllowlist(): string[] {
  const fromEnv = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return Array.from(new Set([...DEFAULT_ALLOWLIST.map((e) => e.toLowerCase()), ...fromEnv]))
}

export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminAllowlist().includes(email.trim().toLowerCase())
}
