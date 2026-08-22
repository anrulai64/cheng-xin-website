import type { MetadataRoute } from "next"
import { siteConfig, services, serviceAreas, blogPosts } from "@/lib/site-data"
import {
  getPublicCaseSitemapEntries,
  getPublicCaseCategorySitemapEntries,
} from "@/lib/case-studies/queries"
import { getPublicArticleSitemapEntries } from "@/lib/articles/public"

// This sitemap reads live Case Study AND CMS Article data from Supabase
// (public anon RLS). STEP A6-E: rendered per-request (force-dynamic) rather
// than build-time ISR. Two reasons:
//  1. Correctness (§15): CMS Article visibility flips with status and the
//     Asia/Taipei start_date/end_date window with no redeploy, so a cached
//     sitemap would go stale. force-dynamic re-evaluates "today" every crawl.
//     This matches /blog and /blog/[slug], which are already force-dynamic.
//  2. The route must not be prerendered at build time, where Supabase env
//     vars are absent — that build-time read is what previously failed and
//     was only tolerated because the Case block swallowed it. The CMS Article
//     read (§16) is intentionally NOT swallowed, so it must run at request
//     time, when the anon Supabase client is properly configured.
// This is a first-class Next.js route config, not a cookies()/headers() hack.
export const dynamic = "force-dynamic"

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

  // CMS Article /blog/{slug} URLs (STEP A6-E) — additive to the six legacy
  // Blog entries above, never a replacement. Legacy owns any shared slug:
  // a CMS Article whose slug collides with a legacy post is excluded here so
  // /blog/{slug} appears exactly once, keeping the legacy entry authoritative.
  //
  // Unlike the Case Study block below, a CMS Article read failure is NOT
  // caught/omitted: getPublicArticleSitemapEntries() throws a sanitized error
  // on DB failure and we let it surface, rather than silently fabricating
  // "0 public Articles" and dropping every CMS URL from the sitemap (§16).
  const legacyBlogSlugs = new Set(blogPosts.map((p) => p.slug))
  const cmsArticleEntries = await getPublicArticleSitemapEntries()
  const cmsBlogRoutes = cmsArticleEntries
    .filter((a) => hasUsableSlug(a.slug) && !legacyBlogSlugs.has(a.slug))
    .map((a) => ({
      url: `${base}/blog/${a.slug.trim()}`,
      lastModified: toLastModified(a.updated_at, null),
      changeFrequency: "monthly" as const,
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
    ...cmsBlogRoutes,
  ]
}
