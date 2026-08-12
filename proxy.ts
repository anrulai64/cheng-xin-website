import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

/**
 * Next.js 16 proxy (formerly middleware). Runs only on /admin routes so the
 * public marketing site is completely untouched.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/admin/:path*"],
}
