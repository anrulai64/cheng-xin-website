import "server-only"

import { createPublicClient } from "@/lib/supabase/public"
import { getTaipeiTodayDateString, isArticlePubliclyVisible } from "@/lib/articles/visibility"

/**
 * PUBLIC CMS Article query layer (read-only), STEP A6-A (fixed in A6-A-FIX).
 *
 * Mirrors the established lib/case-studies/queries.ts conventions: reuses an
 * anon/publishable Supabase client (no service_role, no requireAdmin()),
 * exposes narrow public-facing types, and keeps its visibility filter in
 * lockstep with the "articles_select_public" RLS policy
 * (scripts/013_article_cms_v1_security.sql, refined for timezone in
 * scripts/017_article_cms_v1_public_visibility_timezone.sql) — RLS remains
 * authoritative; this filter (plus the final independent check below) makes
 * the intent explicit and adds defense in depth.
 *
 * A6-A-FIX: uses `lib/supabase/public.ts` (`createPublicClient`) rather than
 * `lib/supabase/server.ts`. The latter calls `cookies()` (a Next.js dynamic
 * API) to support authenticated Admin requests; that dependency forced this
 * route into per-request dynamic rendering and broke the six statically
 * prerendered legacy `/blog/[slug]` paths that share this route file
 * (DYNAMIC_SERVER_USAGE in production). This query layer is public-read-only
 * and never needs a session, so it now uses the anon-only, dynamic-API-free
 * client instead — still governed by RLS, never service_role.
 *
 * SCOPE LOCK (STEP A6-A, extended in A6-B): only the fields needed for the
 * public CMS Article read path and its Next.js Metadata contract are
 * selected/returned here. STEP A6-B adds seo_title/seo_description/
 * seo_keywords (plain-text SEO overrides, already implemented in Admin) for
 * generateMetadata() to consume. No cover image, FAQ, related articles,
 * head_code, memo, content_updated_date, or other still-locked columns are
 * queried.
 */

export type PublicArticleDetail = {
  id: string
  title: string
  slug: string
  category_id: string
  /** Resolved from article_categories.name. Never a raw UUID; null on lookup miss. */
  category_name: string | null
  status: string
  /** Editorial metadata only — never used for visibility. */
  publish_date: string
  start_date: string | null
  end_date: string | null
  excerpt: string | null
  content_html: string | null
  /** Plain-text SEO overrides (STEP A6-B). Never HTML; never rendered via dangerouslySetInnerHTML. */
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
}

function assertNoError(error: { message: string; code?: string } | null, context: string): void {
  if (error) {
    // Server-side only — never forward error.message/code/details to the client.
    console.error(`[v0] articles query failed (${context}):`, error.message)
    throw new Error("讀取文章資料時發生錯誤，請稍後再試。")
  }
}

/**
 * One publicly visible CMS Article by exact slug, or null when the slug does
 * not exist, or a row exists but fails the visibility contract (status not
 * "published", or outside the start_date/end_date window). `publish_date`
 * never participates in this check.
 *
 * Defense in depth: filters status + the Asia/Taipei "today" scheduling
 * window at the query level, THEN independently re-confirms the exact same
 * predicate in application code via isArticlePubliclyVisible() before
 * returning a non-null result — so a query-level mistake alone could never
 * leak a non-visible Article.
 */
export async function getPublicCmsArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  const trimmed = slug?.trim()
  if (!trimmed) return null

  const supabase = createPublicClient()
  const today = getTaipeiTodayDateString()

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, slug, category_id, status, publish_date, start_date, end_date, excerpt, content_html, seo_title, seo_description, seo_keywords",
    )
    .eq("slug", trimmed)
    .eq("status", "published")
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .maybeSingle()

  assertNoError(error, "getPublicCmsArticleBySlug")
  if (!data) return null

  // Independent final check (defense in depth) — never rely on the query
  // filters above alone. If this ever disagrees with them, fail closed.
  if (!isArticlePubliclyVisible(data, today)) return null

  // Category name resolved via a scoped lookup (a plain-text-only label in
  // this STEP — no public category route exists yet, so it is never a link).
  // A missing/failed lookup falls back to null; it never exposes the raw
  // category_id UUID and never fabricates a name.
  const { data: category, error: catError } = await supabase
    .from("article_categories")
    .select("name")
    .eq("id", data.category_id)
    .maybeSingle()

  assertNoError(catError, "getPublicCmsArticleBySlug:category")

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    category_id: data.category_id,
    category_name: category?.name ?? null,
    status: data.status,
    publish_date: data.publish_date,
    start_date: data.start_date,
    end_date: data.end_date,
    excerpt: data.excerpt,
    content_html: data.content_html,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    seo_keywords: data.seo_keywords,
  }
}

/**
 * PUBLIC CMS Article LIST card shape, STEP A6-D.
 *
 * Deliberately narrower than PublicArticleDetail — a Blog index card never
 * needs content_html, SEO overrides, or (still-unimplemented) Cover Image
 * fields. Only what /blog actually renders is selected/returned.
 */
export type PublicArticleListItem = {
  id: string
  title: string
  slug: string
  category_id: string
  /** Resolved from article_categories.name. Never a raw UUID; null on lookup miss. */
  category_name: string | null
  /** Editorial metadata only — never used for visibility. */
  publish_date: string
  excerpt: string | null
}

/**
 * All publicly visible CMS Articles for the /blog index, as list cards.
 *
 * Reuses the exact same visibility contract as getPublicCmsArticleBySlug:
 * query-level status + Asia/Taipei start_date/end_date window filtering,
 * THEN an independent per-row isArticlePubliclyVisible() re-check before any
 * row is included in the returned list (defense in depth, applied at list
 * scale rather than single-row scale). No sort order is applied here — the
 * caller (app/blog/page.tsx) owns merging with Legacy posts and sorting the
 * combined list.
 */
export async function getPublicCmsArticleList(): Promise<PublicArticleListItem[]> {
  const supabase = createPublicClient()
  const today = getTaipeiTodayDateString()

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, category_id, status, publish_date, start_date, end_date, excerpt")
    .eq("status", "published")
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)

  assertNoError(error, "getPublicCmsArticleList")

  const visibleRows = (data ?? []).filter((row) => isArticlePubliclyVisible(row, today))
  if (visibleRows.length === 0) return []

  // Batched category-name lookup (mirrors lib/case-studies/queries.ts'
  // resolveCategoryNames pattern) — one query for all rows, not N+1.
  const uniqueCategoryIds = [...new Set(visibleRows.map((row) => row.category_id))]
  const { data: categories, error: catError } =
    uniqueCategoryIds.length > 0
      ? await supabase.from("article_categories").select("id, name").in("id", uniqueCategoryIds)
      : { data: [] as { id: string; name: string }[], error: null }

  assertNoError(catError, "getPublicCmsArticleList:categories")

  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]))

  return visibleRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category_id: row.category_id,
    category_name: categoryNames.get(row.category_id) ?? null,
    publish_date: row.publish_date,
    excerpt: row.excerpt,
  }))
}
