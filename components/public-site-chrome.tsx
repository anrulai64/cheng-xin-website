"use client"

import { usePathname } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { FloatingContact } from "@/components/floating-contact"

/**
 * EDITOR-UX-01-FIX2. The admin CMS is nested under the same app-wide root
 * layout as the public marketing site, so it previously always rendered the
 * public SiteHeader/SiteFooter/FloatingContact around every /admin route.
 * SiteHeader is `sticky top-0 z-50`, which visually occluded the editor
 * toolbar's own `sticky top-0 z-10` once both were pinned to the same
 * viewport row — see EDITOR UX-01 FIX2 diagnosis. This component is the
 * single, narrowly-scoped place that decides whether that public chrome
 * renders at all, based purely on the current pathname, without moving any
 * routes or changing any URL.
 */
export function PublicSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin") ?? false

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <FloatingContact />
    </>
  )
}
