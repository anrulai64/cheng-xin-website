import type { MetadataRoute } from "next"
import { siteConfig, services, serviceAreas, blogPosts } from "@/lib/site-data"
import {
  getPublicCaseSitemapEntries,
  getPublicCaseCategorySitemapEntries,
} from "@/lib/case-studies/queries"

// This sitemap reads live Case Study data from Supabase (public anon RLS), so
// the route is dynamic. Revalidate hourly to avoid a DB hit on every crawl
// while keeping CMS URLs reasonably fresh.
export const revalidate = 3600

/** True only for a usable, non-blank slug (rejects null / "" / whitespace). */
function hasUsableSlug(slug: string | null | undefined): slug is string {
  return typeof slug === "string" && slug.trim().length > 0
}

/** Prefer updated_at, fall back to created_at, then to a stable epoch. */
function toLastModified(updatedAt: string | null, createdAt: string | null): Date {
  const raw = updatedAt ?? createdAt
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d
  }
  // Neutral fallback; avoids signaling "changed now" when no timestamp exists.
  return new Date(0)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url
  const now = new Date()

  const staticRoutes = ["", "/about", "/services", "/service-areas", "/case-studies", "/blog", "/faq", "/contact"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
    }),
  )

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const areaRoutes = serviceAreas.map((a) => ({
    url: `${base}/service-areas/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const blogRoutes = blogPosts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }))

  // Case Study detail + category URLs come from Supabase only. A transient DB
  // failure must not take down the whole sitemap: on error we log server-side
  // and omit ONLY the dynamic Case entries (no legacy fallback URLs injected).
  let caseRoutes: MetadataRoute.Sitemap = []
  let caseCategoryRoutes: MetadataRoute.Sitemap = []
  try {
    const [caseEntries, categoryEntries] = await Promise.all([
      getPublicCaseSitemapEntries(),
      getPublicCaseCategorySitemapEntries(),
    ])

    caseRoutes = caseEntries
      .filter((c) => hasUsableSlug(c.slug))
      .map((c) => ({
        url: `${base}/case-studies/${c.slug!.trim()}`,
        lastModified: toLastModified(c.updated_at, c.created_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))

    caseCategoryRoutes = categoryEntries
      .filter((c) => hasUsableSlug(c.slug))
      .map((c) => ({
        url: `${base}/case-studies/category/${c.slug!.trim()}`,
        lastModified: toLastModified(c.updated_at, c.created_at),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
  } catch (error) {
    console.error(
      "[v0] sitemap: Case Study Supabase read failed; omitting dynamic Case entries:",
      error instanceof Error ? error.message : "unknown error",
    )
  }

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...areaRoutes,
    ...caseRoutes,
    ...caseCategoryRoutes,
    ...blogRoutes,
  ]
}
