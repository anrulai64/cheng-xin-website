import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getTaipeiTodayDateString, isArticlePubliclyVisible } from "@/lib/articles/visibility"

/**
 * PUBLIC CMS Article query layer (read-only), STEP A6-A.
 *
 * Mirrors the established lib/case-studies/queries.ts conventions: reuses the
 * anon/publishable Supabase server client (no service_role, no
 * requireAdmin()), exposes narrow public-facing types, and keeps its
 * visibility filter in lockstep with the "articles_select_public" RLS policy
 * (scripts/013_article_cms_v1_security.sql) — RLS remains authoritative;
 * this filter (plus the final independent check below) makes the intent
 * explicit and adds defense in depth.
 *
 * SCOPE LOCK (STEP A6-A): only the fields needed for the very first public
 * CMS Article read path are selected/returned here. No cover image, FAQ,
 * related articles, SEO fields, head_code, memo, or other STEP A6-A-locked
 * columns are queried.
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

  const supabase = await createClient()
  const today = getTaipeiTodayDateString()

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, slug, category_id, status, publish_date, start_date, end_date, excerpt, content_html")
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
  }
}
