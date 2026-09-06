"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { isEmptyArticleHtml, sanitizeArticleContentHtml } from "@/lib/articles/sanitize"
import { ARTICLE_IMAGE_BUCKET, isOwnedArticleCoverPath } from "@/lib/admin/articles/cover-image"

const LIST_PATH = "/admin/articles"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const STATUS_VALUES = new Set(["draft", "published", "offline"])
// STEP A8-B — same plain "YYYY-MM-DD" shape produced by the native
// <input type="date"> used for publish_date/start_date/end_date. Reused here
// rather than inventing a second date/time convention.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// `warning` is populated ONLY on the ok:true branch when the Article row
// delete succeeded but the Cover Storage cleanup (A7-B3) could not be fully
// completed (invalid ownership or a Storage remove failure). It never
// indicates the Article delete itself failed.
export type ActionResult = { ok: true; id?: string; warning?: string } | { ok: false; error: string }

type Fields = {
  title: string
  category_id: string
  slug: string
  status: string
  publish_date: string
  start_date: string | null
  end_date: string | null
  excerpt: string
  // cover_alt: plain-text accessible alt for the cover image. Persisted here
  // (A7-A). NOTE: cover_image_url is intentionally absent — it is never read
  // from client FormData, so the client cannot forge an arbitrary image URL.
  // The real cover_image_url write path is the A7-B Storage lifecycle.
  cover_alt: string | null
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  content_html: string | null
  // STEP A8-B — editor-controlled "meaningful editorial content update" date.
  // NEVER auto-derived (not now(), not publish_date, not updated_at, not a
  // content diff). Optional; "" from the client normalizes to NULL, exactly
  // like start_date/end_date.
  content_updated_date: string | null
}

/**
 * Normalizes + sanitizes raw content_html from the Admin RichText editor
 * before persistence. Pipeline:
 *   1. Detect genuinely editor-empty raw HTML -> NULL (skips sanitization
 *      entirely for the common empty case). Uses the shared
 *      isEmptyArticleHtml() shape-check (lib/articles/sanitize.ts) so the
 *      Admin save path and the public render path never drift.
 *   2. Otherwise, run the untrusted HTML through the server-side allowlist
 *      sanitizer (sanitizeArticleContentHtml).
 *   3. If sanitization strips everything meaningful (e.g. disallowed-only
 *      input like "<script>alert(1)</script>") the result is empty ->
 *      NULL, so we never store a dangerous or meaningless body.
 *   4. Otherwise, store the sanitized HTML string.
 */
function normalizeContentHtml(raw: string): string | null {
  if (isEmptyArticleHtml(raw)) return null

  const sanitized = sanitizeArticleContentHtml(raw)
  if (isEmptyArticleHtml(sanitized)) return null
  return sanitized
}

/** Read + normalize the Article form fields. Returns a field-level error string on failure. */
function readFields(formData: FormData): Fields | { error: string } {
  const str = (key: string) => {
    const v = formData.get(key)
    return typeof v === "string" ? v.trim() : ""
  }
  const orNull = (v: string) => (v === "" ? null : v)

  const title = str("title")
  if (title === "") {
    return { error: "請輸入文章標題。" }
  }

  const category_id = str("category_id")
  if (category_id === "") {
    return { error: "請選擇文章分類。" }
  }

  const rawSlug = str("slug").toLowerCase()
  if (rawSlug === "") {
    return { error: "請輸入 Slug。" }
  }
  if (/\s/.test(rawSlug) || !SLUG_PATTERN.test(rawSlug)) {
    return { error: "Slug 格式錯誤，僅可使用小寫英文字母、數字與半形連字號（-）。" }
  }

  const status = str("status") || "draft"
  if (!STATUS_VALUES.has(status)) {
    return { error: "狀態設定不正確，請重新選擇。" }
  }

  const publish_date = str("publish_date")
  if (publish_date === "") {
    return { error: "請選擇發布日期。" }
  }

  const start_date = orNull(str("start_date"))
  const end_date = orNull(str("end_date"))
  if (start_date && end_date && start_date > end_date) {
    return { error: "上線開始日期不可晚於下線日期。" }
  }

  // STEP A8-B — optional, human-controlled field. Empty input (the default,
  // and the result of explicitly clearing it) normalizes to NULL — never to
  // now()/publish_date/updated_at, and never inferred from any other field.
  // When non-empty, it must be a well-formed calendar date; malformed input
  // fails safely with a field-level error rather than being silently coerced
  // or persisted as garbage.
  const rawContentUpdatedDate = str("content_updated_date")
  let content_updated_date: string | null = null
  if (rawContentUpdatedDate !== "") {
    const isWellFormed = DATE_PATTERN.test(rawContentUpdatedDate) && !Number.isNaN(Date.parse(rawContentUpdatedDate))
    if (!isWellFormed) {
      return { error: "內容更新日期格式錯誤，請重新選擇。" }
    }
    content_updated_date = rawContentUpdatedDate
  }

  const excerpt = str("excerpt")
  if (excerpt === "") {
    return { error: "請輸入文章摘要。" }
  }

  // cover_alt: plain text only (never sanitized as HTML, never a content
  // field). Trim + empty→null. Optional in A7-A; not conditionally required
  // on cover_image_url presence (that rule is deferred to a later STEP).
  const cover_alt = orNull(str("cover_alt"))

  // content_html remains optional (see A5-B §8) — the raw value (not the
  // trimmed `str()` helper) is normalized so leading/trailing whitespace
  // inside meaningful HTML is not altered.
  const rawContentHtml = formData.get("content_html")
  const content_html = normalizeContentHtml(typeof rawContentHtml === "string" ? rawContentHtml : "")

  return {
    title,
    category_id,
    slug: rawSlug,
    status,
    publish_date,
    start_date,
    end_date,
    excerpt,
    cover_alt,
    seo_title: orNull(str("seo_title")),
    seo_keywords: orNull(str("seo_keywords")),
    seo_description: orNull(str("seo_description")),
    content_html,
    content_updated_date,
  }
}

export async function createArticle(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  let fields: Fields | { error: string }
  try {
    fields = readFields(formData)
  } catch {
    return { ok: false, error: "建立文章失敗，請稍後再試。" }
  }
  if ("error" in fields) return { ok: false, error: fields.error }

  // Server-side category existence check — never trust the browser <select>.
  const { data: categoryMatch, error: categoryError } = await supabase
    .from("article_categories")
    .select("id")
    .eq("id", fields.category_id)
    .limit(1)
  if (categoryError) {
    return { ok: false, error: "建立文章失敗，請稍後再試。" }
  }
  if (!categoryMatch || categoryMatch.length === 0) {
    return { ok: false, error: "文章分類不存在，請重新選擇。" }
  }

  // Duplicate-slug pre-check (the DB UNIQUE constraint is the final guard).
  const { data: slugMatches, error: slugCheckError } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", fields.slug)
    .limit(1)
  if (slugCheckError) {
    return { ok: false, error: "建立文章失敗，請稍後再試。" }
  }
  if (slugMatches && slugMatches.length > 0) {
    return { ok: false, error: "此 Slug 已被其他文章使用。" }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("articles")
    .insert({
      title: fields.title,
      category_id: fields.category_id,
      slug: fields.slug,
      status: fields.status,
      publish_date: fields.publish_date,
      start_date: fields.start_date,
      end_date: fields.end_date,
      excerpt: fields.excerpt,
      cover_alt: fields.cover_alt,
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
      content_html: fields.content_html,
      content_updated_date: fields.content_updated_date,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "此 Slug 已被其他文章使用。" }
    }
    return { ok: false, error: "建立文章失敗，請稍後再試。" }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id: inserted.id }
}

export async function updateArticle(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // TEMP-A10-C-TRACE — TRACE POINT 1. Logs ONLY the raw content_html string
  // exactly as received from the client FormData, before any normalization
  // or sanitization runs. No other field, token, session, or credential is
  // logged. Remove this block once the two-point trace is complete.
  {
    const rawContentHtmlTrace = formData.get("content_html")
    console.log(
      "[v0] TEMP-A10-C-TRACE-1 (Server Action input content_html):",
      typeof rawContentHtmlTrace === "string" ? rawContentHtmlTrace : String(rawContentHtmlTrace),
    )
  }

  let fields: Fields | { error: string }
  try {
    fields = readFields(formData)
  } catch {
    return { ok: false, error: "更新文章失敗，請稍後再試。" }
  }
  if ("error" in fields) return { ok: false, error: fields.error }

  // Confirm the Article still exists before validating further — avoids
  // treating a zero-row UPDATE later as a silent success.
  const { data: existing, error: existingError } = await supabase
    .from("articles")
    .select("id")
    .eq("id", id)
    .limit(1)
  if (existingError) {
    return { ok: false, error: "更新文章失敗，請稍後再試。" }
  }
  if (!existing || existing.length === 0) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  // Server-side category existence check — never trust the browser <select>.
  const { data: categoryMatch, error: categoryError } = await supabase
    .from("article_categories")
    .select("id")
    .eq("id", fields.category_id)
    .limit(1)
  if (categoryError) {
    return { ok: false, error: "更新文章失敗，請��後再試。" }
  }
  if (!categoryMatch || categoryMatch.length === 0) {
    return { ok: false, error: "文章分類不存在，請重新選擇。" }
  }

  // Duplicate-slug pre-check, excluding this Article's own row so an unchanged
  // slug can always be saved (the DB UNIQUE constraint is the final guard).
  const { data: slugMatches, error: slugCheckError } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", fields.slug)
    .neq("id", id)
    .limit(1)
  if (slugCheckError) {
    return { ok: false, error: "更新文章失敗，請稍後再試。" }
  }
  if (slugMatches && slugMatches.length > 0) {
    return { ok: false, error: "此 Slug 已被其他文章使用。" }
  }

  const { data: updated, error: updateError } = await supabase
    .from("articles")
    .update({
      title: fields.title,
      category_id: fields.category_id,
      slug: fields.slug,
      status: fields.status,
      publish_date: fields.publish_date,
      start_date: fields.start_date,
      end_date: fields.end_date,
      excerpt: fields.excerpt,
      cover_alt: fields.cover_alt,
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
      content_html: fields.content_html,
      content_updated_date: fields.content_updated_date,
    })
    .eq("id", id)
    .select("id")

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, error: "此 Slug 已被其他文章使用。" }
    }
    return { ok: false, error: "更新文章失敗，請稍後再試。" }
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  // TEMP-A10-C-TRACE — TRACE POINT 2. Reads back ONLY content_html for this
  // row, via the existing authenticated server-side Supabase client (no
  // service_role, no new query path). Logs ONLY that one field. Remove this
  // block once the two-point trace is complete.
  {
    const { data: traceReadBack, error: traceReadBackError } = await supabase
      .from("articles")
      .select("content_html")
      .eq("id", id)
      .single()
    if (traceReadBackError) {
      console.log("[v0] TEMP-A10-C-TRACE-2 (DB read-back failed):", traceReadBackError.message)
    } else {
      console.log("[v0] TEMP-A10-C-TRACE-2 (DB read-back content_html):", traceReadBack?.content_html ?? null)
    }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id }
}

// FK audit (see scripts/002_articles_schema.sql, scripts/012_article_cms_v1_schema.sql):
//   - article_faqs.article_id -> articles(id) ON DELETE CASCADE
//   - article_related_articles.article_id -> articles(id) ON DELETE CASCADE
//   - article_related_articles.related_article_id -> articles(id) ON DELETE CASCADE
// All three child references CASCADE. Deleting the Article row directly is
// therefore safe and sufficient — no manual FAQ / related-article row
// deletion is needed here, and none is performed.
// STEP A7-B3 — Article Delete Storage Cleanup.
//
// Hard ordering contract (never reversed):
//   1. requireAdmin
//   2. fetch Article by id -> minimal fields: id, cover_image_path
//   3. validate cover ownership if a path exists (reuses the A7-B2
//      isOwnedArticleCoverPath helper — no second ownership algorithm)
//   4. delete the Article row
//   5. confirm the delete actually removed a row (zero-row is NOT success)
//   6. ONLY after DB delete success: clean up the exact Cover Storage object
//   7. revalidate the Admin list
//
// Deleting Storage BEFORE the DB row would risk a live Article pointing at a
// missing cover if the row delete then failed. The reverse (row deleted, then
// Storage cleanup fails) only ever leaves a harmless orphan object, which is
// the acceptable worst case here.
export async function deleteArticle(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // Minimal existence check — never load title/slug/content/seo/cover_alt.
  // cover_image_path is the ONLY additional field needed, and it is read
  // exclusively from the DB — the client never supplies it.
  const { data: existing, error: existingError } = await supabase
    .from("articles")
    .select("id, cover_image_path")
    .eq("id", id)
    .limit(1)

  if (existingError) {
    return { ok: false, error: "刪除文章失敗，請稍後再試。" }
  }
  if (!existing || existing.length === 0) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  const coverPath = existing[0].cover_image_path

  // Ownership is evaluated before the delete so the outcome (owned / not
  // owned / absent) is known deterministically, but the actual Storage
  // mutation always happens AFTER the DB delete succeeds (§ ordering above).
  // An invalid/foreign path is NEVER deleted and NEVER blocks the row delete
  // — it only downgrades the eventual result to a partial-success warning.
  const ownedCoverPath = coverPath && isOwnedArticleCoverPath(coverPath, id) ? coverPath : null
  const foreignCoverPath = coverPath && !ownedCoverPath ? coverPath : null

  const { data: deleted, error: deleteError } = await supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .select("id")

  if (deleteError) {
    if (deleteError.code === "23503") {
      // All known child FKs CASCADE (see audit note above), so a 23503 here
      // would indicate an unexpected reference this code does not know
      // about. Do not guess which table caused it. Storage is untouched.
      return { ok: false, error: "文章目前仍被其他資料使用，暫時無法刪除。" }
    }
    return { ok: false, error: "刪除文章失敗，請稍後再試。" }
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  // Core Article deletion has succeeded from this point on. Everything below
  // is best-effort cleanup — its outcome is reported as `warning`, never as
  // an `error`, because the row delete itself must not be re-litigated.
  revalidatePath(LIST_PATH)

  if (foreignCoverPath) {
    // The stored path did not belong to this Article's namespace. Never
    // delete it (could belong to another Article, another bucket, or be
    // corrupt metadata) — just log the anomaly and surface a warning.
    console.error("[v0] article delete: cover path not owned by article, skipping delete", id, foreignCoverPath)
    return { ok: true, id, warning: "文章已刪除，但封面圖片檔案清理失敗，請稍後再試或聯絡管理員。" }
  }

  if (ownedCoverPath) {
    // Delete the exact object only — never a folder/prefix/wildcard.
    const { error: removeError } = await supabase.storage.from(ARTICLE_IMAGE_BUCKET).remove([ownedCoverPath])
    if (removeError) {
      // An already-missing object does not surface as an error from the SDK,
      // so reaching here means a genuine permission/network/unexpected
      // Storage failure. The Article row is already deleted and stays
      // deleted; the leftover object is an orphan, not a broken reference.
      console.error("[v0] article delete: cover storage cleanup failed (orphan left)", id, ownedCoverPath, removeError)
      return { ok: true, id, warning: "文章已刪除，但封面圖片檔案清理失敗，請稍後再試或聯絡管理員。" }
    }
  }

  return { ok: true, id }
}
