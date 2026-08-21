"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const LIST_PATH = "/admin/articles"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const STATUS_VALUES = new Set(["draft", "published", "offline"])

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

type Fields = {
  title: string
  category_id: string
  slug: string
  status: string
  publish_date: string
  start_date: string | null
  end_date: string | null
  excerpt: string
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
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

  const excerpt = str("excerpt")
  if (excerpt === "") {
    return { error: "請輸入文章摘要。" }
  }

  return {
    title,
    category_id,
    slug: rawSlug,
    status,
    publish_date,
    start_date,
    end_date,
    excerpt,
    seo_title: orNull(str("seo_title")),
    seo_keywords: orNull(str("seo_keywords")),
    seo_description: orNull(str("seo_description")),
  }
}

export async function createArticle(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const fields = readFields(formData)
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
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
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

  const fields = readFields(formData)
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
    return { ok: false, error: "更新文章失敗，請稍後再試。" }
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
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
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

  revalidatePath(LIST_PATH)
  return { ok: true, id }
}
