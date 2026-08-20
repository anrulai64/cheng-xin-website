import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * PUBLIC Case Studies query layer (read-only).
 *
 * This module is the single source of truth for reading publicly visible
 * Case Study data from Supabase. It is consumed by future public Server
 * Components (list, detail, sitemap, structured data). It contains NO
 * mutations and requires NO admin authentication.
 *
 * Auth model:
 * - Reuses the existing anon/publishable Supabase server client
 *   (`lib/supabase/server.ts`). With no admin session present, requests run
 *   as the anonymous role and are governed by the existing public SELECT RLS
 *   policies (scripts/004_cases_schema.sql). We never use service_role and
 *   never call requireAdmin().
 * - The visibility rule below intentionally MIRRORS the RLS predicate so the
 *   app-level filters and the database policy stay in lockstep. RLS remains
 *   authoritative; these filters make intent explicit and keep list/detail/
 *   related logic identical.
 */

// ---------------------------------------------------------------------------
// Public-facing types (what the public frontend actually consumes). These are
// deliberately narrower than the full database Row types.
// ---------------------------------------------------------------------------

export type PublicCaseCoverImage = {
  public_url: string
  alt_text: string | null
}

export type PublicCaseImage = {
  id: string
  public_url: string
  alt_text: string | null
  sort_order: number
}

export type PublicCaseCategory = {
  id: string
  name: string
  slug: string | null
  image_url: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
}

export type PublicCaseCard = {
  id: string
  slug: string | null
  name: string
  location: string | null
  category_id: string
  /** Resolved from case_categories.name (maps to the legacy `propertyType`). */
  category_name: string | null
  short_description: string | null
  status: string
  cover: PublicCaseCoverImage | null
}

export type PublicCaseDetail = {
  id: string
  slug: string | null
  name: string
  location: string | null
  /** 案例基本資料 (detail-only free-text). Not part of list cards. */
  property_type: string | null
  property_condition: string | null
  floor_area: string | null
  layout: string | null
  category_id: string
  category_name: string | null
  category_slug: string | null
  short_description: string | null
  description_html: string | null
  detail_html: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  status: string
  publish_start: string | null
  publish_end: string | null
}

// ---------------------------------------------------------------------------
// Shared visibility rule (mirrors case_items_select_public RLS).
//
//   status <> 'offline'
//   AND (publish_start IS NULL OR publish_start <= now())
//   AND (publish_end   IS NULL OR publish_end   >= now())
//
// Both status 'sale' and 'display' are public; only 'offline' is hidden.
// ---------------------------------------------------------------------------

/**
 * Applies the shared public-visibility filter to any `case_items` query
 * builder. Centralized so list/detail/related never diverge. Uses two separate
 * `.or()` calls, which PostgREST combines with AND, producing exactly the RLS
 * predicate above.
 */
function withCaseVisibility<
  Q extends {
    neq(column: string, value: string): Q
    or(filters: string): Q
  },
>(query: Q): Q {
  const nowIso = new Date().toISOString()
  return query
    .neq("status", "offline")
    .or(`publish_start.is.null,publish_start.lte.${nowIso}`)
    .or(`publish_end.is.null,publish_end.gte.${nowIso}`)
}

// ---------------------------------------------------------------------------
// Error handling: distinguish a genuine query failure from a valid empty
// result. On failure we log details server-side (never to the client) and
// throw a sanitized error so callers/error boundaries can react instead of
// silently treating it as "no data".
// ---------------------------------------------------------------------------

function assertNoError(
  error: { message: string; code?: string } | null,
  context: string,
): void {
  if (error) {
    console.error(`[v0] case-studies query failed (${context}):`, error.message)
    throw new Error("讀取實績案例資料時發生錯誤，請稍後再試。")
  }
}

// ---------------------------------------------------------------------------
// Internal helpers: resolve category names and cover images via scoped second
// queries. The generated Supabase types expose empty `Relationships` metadata
// for these tables, so PostgREST embedded joins are unreliable; scoped lookups
// keyed by id are robust and fully typed.
// ---------------------------------------------------------------------------

async function resolveCategoryNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(categoryIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("case_categories")
    .select("id, name")
    .in("id", uniqueIds)

  assertNoError(error, "resolveCategoryNames")
  return new Map((data ?? []).map((c) => [c.id, c.name]))
}

/**
 * Cover-image rule: for each case, the first `case_images` row ordered by
 * sort_order ASC, then created_at ASC. Implemented as one scoped query over
 * all requested case ids, reduced to the first image per case in JS.
 */
async function resolveCoverImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseIds: string[],
): Promise<Map<string, PublicCaseCoverImage>> {
  const uniqueIds = [...new Set(caseIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("case_images")
    .select("case_id, public_url, alt_text, sort_order, created_at")
    .in("case_id", uniqueIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(error, "resolveCoverImages")

  const covers = new Map<string, PublicCaseCoverImage>()
  for (const img of data ?? []) {
    // Rows arrive pre-ordered; keep only the first per case with a usable url.
    if (covers.has(img.case_id)) continue
    if (!img.public_url) continue
    covers.set(img.case_id, { public_url: img.public_url, alt_text: img.alt_text })
  }
  return covers
}

type CaseCardRow = {
  id: string
  slug: string | null
  name: string
  location: string | null
  category_id: string
  short_description: string | null
  status: string
}

/**
 * Turns raw visible `case_items` card rows into PublicCaseCard[], resolving
 * category names and cover images. Preserves the input order.
 */
async function buildCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CaseCardRow[],
): Promise<PublicCaseCard[]> {
  if (rows.length === 0) return []

  const [categoryNames, covers] = await Promise.all([
    resolveCategoryNames(
      supabase,
      rows.map((r) => r.category_id),
    ),
    resolveCoverImages(
      supabase,
      rows.map((r) => r.id),
    ),
  ])

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    location: r.location,
    category_id: r.category_id,
    category_name: categoryNames.get(r.category_id) ?? null,
    short_description: r.short_description,
    status: r.status,
    cover: covers.get(r.id) ?? null,
  }))
}

// Card-level columns loaded for list/related queries (no heavy HTML bodies).
const CARD_COLUMNS = "id, slug, name, location, category_id, short_description, status"

// ---------------------------------------------------------------------------
// Public query functions
// ---------------------------------------------------------------------------

/**
 * All public Case Study categories, ordered sort_order ASC, created_at ASC.
 * Not filtered by case count (no such business rule exists).
 */
export async function getPublicCaseCategories(): Promise<PublicCaseCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_categories")
    .select("id, name, slug, image_url, seo_title, seo_description, seo_keywords")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(error, "getPublicCaseCategories")
  return data ?? []
}

/**
 * All publicly visible Case Studies as cards, ordered sort_order ASC,
 * created_at ASC. Applies the shared visibility rule; resolves category name
 * and cover image. Does not load detail_html, gallery, or related cases.
 */
export async function getPublicCaseList(): Promise<PublicCaseCard[]> {
  const supabase = await createClient()

  const { data, error } = await withCaseVisibility(
    supabase.from("case_items").select(CARD_COLUMNS),
  )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(error, "getPublicCaseList")
  return buildCards(supabase, (data ?? []) as CaseCardRow[])
}

/**
 * One publicly visible Case Study by exact slug, or null when the slug does
 * not exist or the case is offline / not yet published / expired. Includes the
 * HTML bodies and SEO fields needed for future detail rendering, plus resolved
 * category name/slug. Never returns or executes head_code.
 */
export async function getPublicCaseBySlug(
  slug: string,
): Promise<PublicCaseDetail | null> {
  const trimmed = slug?.trim()
  if (!trimmed) return null

  const supabase = await createClient()

  const { data, error } = await withCaseVisibility(
    supabase
      .from("case_items")
      .select(
        "id, slug, name, location, property_type, property_condition, floor_area, layout, category_id, short_description, description_html, detail_html, seo_title, seo_description, seo_keywords, status, publish_start, publish_end",
      )
      .eq("slug", trimmed),
  ).maybeSingle()

  assertNoError(error, "getPublicCaseBySlug")
  if (!data) return null

  // Resolve category name + slug via a scoped lookup (embedded joins are
  // unreliable given empty generated Relationships metadata).
  const { data: category, error: catError } = await supabase
    .from("case_categories")
    .select("name, slug")
    .eq("id", data.category_id)
    .maybeSingle()

  assertNoError(catError, "getPublicCaseBySlug:category")

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    location: data.location,
    property_type: data.property_type,
    property_condition: data.property_condition,
    floor_area: data.floor_area,
    layout: data.layout,
    category_id: data.category_id,
    category_name: category?.name ?? null,
    category_slug: category?.slug ?? null,
    short_description: data.short_description,
    description_html: data.description_html,
    detail_html: data.detail_html,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    seo_keywords: data.seo_keywords,
    status: data.status,
    publish_start: data.publish_start,
    publish_end: data.publish_end,
  }
}

/**
 * Gallery images for one case, ordered sort_order ASC, created_at ASC.
 * Rows without a usable public_url are dropped. RLS already restricts this to
 * images whose parent case is publicly visible.
 */
export async function getPublicCaseGallery(
  caseId: string,
): Promise<PublicCaseImage[]> {
  const trimmed = caseId?.trim()
  if (!trimmed) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_images")
    .select("id, public_url, alt_text, sort_order")
    .eq("case_id", trimmed)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(error, "getPublicCaseGallery")

  return (data ?? [])
    .filter((img): img is typeof img & { public_url: string } => !!img.public_url)
    .map((img) => ({
      id: img.id,
      public_url: img.public_url,
      alt_text: img.alt_text,
      sort_order: img.sort_order,
    }))
}

/**
 * Publicly visible related cases for a case, DIRECTIONAL: only rows where
 * case_related_cases.case_id = the given id are considered (no reverse/inferred
 * relationships). Relationship order (sort_order ASC, created_at ASC) is
 * preserved; related targets that are not publicly visible are dropped.
 * Returns card-level data only.
 */
export async function getPublicRelatedCases(
  caseId: string,
): Promise<PublicCaseCard[]> {
  const trimmed = caseId?.trim()
  if (!trimmed) return []

  const supabase = await createClient()

  // 1. Ordered relationship rows for this case (directional).
  const { data: relRows, error: relError } = await supabase
    .from("case_related_cases")
    .select("related_case_id, sort_order, created_at")
    .eq("case_id", trimmed)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(relError, "getPublicRelatedCases:relationships")

  const orderedIds = (relRows ?? []).map((r) => r.related_case_id)
  if (orderedIds.length === 0) return []

  // 2. Load only the publicly visible target cases (card columns).
  const { data: itemRows, error: itemError } = await withCaseVisibility(
    supabase.from("case_items").select(CARD_COLUMNS).in("id", orderedIds),
  )

  assertNoError(itemError, "getPublicRelatedCases:items")

  // 3. Preserve relationship order; drop any target that wasn't visible.
  const byId = new Map((itemRows ?? []).map((r) => [r.id, r as CaseCardRow]))
  const orderedVisible = orderedIds
    .map((id) => byId.get(id))
    .filter((r): r is CaseCardRow => r !== undefined)

  return buildCards(supabase, orderedVisible)
}

/**
 * The single visible case intro content HTML (case_intro_content where
 * is_visible = true), or null when no visible row exists. Singleton-safe via
 * maybeSingle. Not rendered publicly in this STEP.
 */
export async function getPublicCaseIntroContent(): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_intro_content")
    .select("content_html")
    .eq("is_visible", true)
    .maybeSingle()

  assertNoError(error, "getPublicCaseIntroContent")
  return data?.content_html ?? null
}

// ---------------------------------------------------------------------------
// Shared Case Study FAQ (case_faqs). Displayed in the「常見問題」tab on Case
// Study detail pages. Not per-case. The visibility filter mirrors the RLS
// predicate (is_visible = true); RLS remains authoritative.
// ---------------------------------------------------------------------------

export type PublicCaseFaq = {
  id: string
  question: string
  answer_html: string
  sort_order: number
}

/**
 * All publicly visible shared Case Study FAQs, ordered sort_order ASC then
 * created_at ASC. Returns only the public-facing columns; no admin-only data.
 * Server-only (this module is `server-only`); never queried from the client.
 */
export async function getPublicCaseFaqs(): Promise<PublicCaseFaq[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("case_faqs")
    .select("id, question, answer_html, sort_order")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  assertNoError(error, "getPublicCaseFaqs")

  return (data ?? []).map((f) => ({
    id: f.id,
    question: f.question,
    answer_html: f.answer_html,
    sort_order: f.sort_order,
  }))
}
