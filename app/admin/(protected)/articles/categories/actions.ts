"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const LIST_PATH = "/admin/articles/categories"

// Article category slugs are required (NOT NULL + UNIQUE at the DB level),
// unlike Case CMS categories which allow a null/auto-generated slug. This is
// a dedicated, minimal validator rather than a reuse of the Case CMS helper.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

type Fields = {
  name: string
  slug: string
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
}

/** Read + normalize the shared form fields. Returns a field-level error string on failure. */
function readFields(formData: FormData): Fields | { error: string } {
  const str = (key: string) => {
    const v = formData.get(key)
    return typeof v === "string" ? v.trim() : ""
  }
  const orNull = (v: string) => (v === "" ? null : v)

  const name = str("name")
  if (name === "") {
    return { error: "請輸入分類名稱。" }
  }

  const rawSlug = str("slug").toLowerCase()
  if (rawSlug === "") {
    return { error: "請輸入 Slug。" }
  }
  if (/\s/.test(rawSlug) || !SLUG_PATTERN.test(rawSlug)) {
    return {
      error: "Slug 格式不正確，僅能使用小寫英文字母、數字與連字號（-），且不可以連字號開頭或結尾。",
    }
  }

  return {
    name,
    slug: rawSlug,
    seo_title: orNull(str("seo_title")),
    seo_keywords: orNull(str("seo_keywords")),
    seo_description: orNull(str("seo_description")),
  }
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const fields = readFields(formData)
  if ("error" in fields) return { ok: false, error: fields.error }

  // Duplicate-name pre-check (application-level only; no DB constraint exists).
  const { data: nameMatches } = await supabase
    .from("article_categories")
    .select("id")
    .eq("name", fields.name)
    .limit(1)
  if (nameMatches && nameMatches.length > 0) {
    return { ok: false, error: "已有相同名稱的文章分類。" }
  }

  // Duplicate-slug pre-check (the DB UNIQUE constraint is the final guard).
  const { data: slugMatches } = await supabase
    .from("article_categories")
    .select("id")
    .eq("slug", fields.slug)
    .limit(1)
  if (slugMatches && slugMatches.length > 0) {
    return { ok: false, error: "此 Slug 已被其他文章分類使用。" }
  }

  // New categories go to the end: highest current sort_order + 1 (or 1 if none exist).
  const { data: maxRows } = await supabase
    .from("article_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
  const nextSortOrder = maxRows && maxRows.length > 0 ? (maxRows[0].sort_order ?? 0) + 1 : 1

  const { data: inserted, error: insertError } = await supabase
    .from("article_categories")
    .insert({
      name: fields.name,
      slug: fields.slug,
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "此 Slug 已被其他文章分類使用。" }
    }
    return { ok: false, error: "建立文章分類失敗，請稍後再試。" }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id: inserted.id }
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const fields = readFields(formData)
  if ("error" in fields) return { ok: false, error: fields.error }

  // Duplicate-name pre-check, excluding this row.
  const { data: nameMatches } = await supabase
    .from("article_categories")
    .select("id")
    .eq("name", fields.name)
    .neq("id", id)
    .limit(1)
  if (nameMatches && nameMatches.length > 0) {
    return { ok: false, error: "已有相同名稱的文章分類。" }
  }

  // Duplicate-slug pre-check, excluding this row.
  const { data: slugMatches } = await supabase
    .from("article_categories")
    .select("id")
    .eq("slug", fields.slug)
    .neq("id", id)
    .limit(1)
  if (slugMatches && slugMatches.length > 0) {
    return { ok: false, error: "此 Slug 已被其他文章分類使用。" }
  }

  // sort_order, created_at, updated_at, head_code, and image_url are
  // intentionally never part of this payload (see A3-B scope).
  const { error: updateError } = await supabase
    .from("article_categories")
    .update({
      name: fields.name,
      slug: fields.slug,
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
    })
    .eq("id", id)

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, error: "此 Slug 已被其他文章分類使用。" }
    }
    return { ok: false, error: "更新文章分類失敗，請稍後再試。" }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id }
}

const CATEGORY_IN_USE_ERROR = "此文章分類目前仍有文章使用，請先將文章移至其他分類後再刪除。"

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // Proactive usage guard: only need to know whether at least one Article
  // exists, never load full rows. The FK (ON DELETE RESTRICT) remains the
  // final safety layer for any race condition between this check and DELETE.
  const { data: usageRows, error: usageError } = await supabase
    .from("articles")
    .select("id")
    .eq("category_id", id)
    .limit(1)

  if (usageError) {
    return { ok: false, error: "刪除文章分類失敗，請稍後再試。" }
  }
  if (usageRows && usageRows.length > 0) {
    return { ok: false, error: CATEGORY_IN_USE_ERROR }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("article_categories")
    .delete()
    .eq("id", id)
    .select("id")

  if (deleteError) {
    if (deleteError.code === "23503") {
      return { ok: false, error: CATEGORY_IN_USE_ERROR }
    }
    return { ok: false, error: "刪除文章分類失敗，請稍後再試。" }
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "文章分類不存在或已被刪除。" }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id }
}
