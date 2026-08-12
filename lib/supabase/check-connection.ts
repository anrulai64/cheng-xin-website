import "server-only"

import { createClient } from "./server"

/**
 * Development-only Supabase connection helper.
 *
 * Purpose: confirm that a Supabase Server Client can be created and reach the
 * project using the public env vars. This is NOT wired into any page, UI, or
 * publicly reachable API route — call it manually from a server context during
 * development if you need to verify connectivity.
 */
export type SupabaseConnectionResult = {
  ok: boolean
  hasUrl: boolean
  hasPublishableKey: boolean
  message: string
}

export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  if (!hasUrl || !hasPublishableKey) {
    return {
      ok: false,
      hasUrl,
      hasPublishableKey,
      message: "Missing Supabase environment variables.",
    }
  }

  try {
    const supabase = await createClient()
    // A lightweight, unauthenticated call that only verifies the client can
    // talk to Supabase Auth. It does not require any table or a logged-in user.
    const { error } = await supabase.auth.getSession()

    if (error) {
      return {
        ok: false,
        hasUrl,
        hasPublishableKey,
        message: `Supabase reachable but returned an error: ${error.message}`,
      }
    }

    return {
      ok: true,
      hasUrl,
      hasPublishableKey,
      message: "Supabase client created and connection verified.",
    }
  } catch (err) {
    return {
      ok: false,
      hasUrl,
      hasPublishableKey,
      message: `Failed to create Supabase client: ${
        err instanceof Error ? err.message : String(err)
      }`,
    }
  }
}
