"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { isValidSlug, slugify } from "@/lib/admin/cases/slug"

const BUCKET = "case-images"
const LIST_PATH = "/admin/cases/categories"

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }

/** Read + normalize the shared category text fields from a submitted form. */
function readFields(formData: FormData) {
  const str = (key: string) => {
    const v = formData.get(key)
    return typeof v === "string" ? v.trim() : ""
  }
  const orNull = (v: string) => (v === "" ? null : v)

  return {
    name: str("name"),
    rawSlug: str("slug").toLowerCase(),
    seo_title: orNull(str("seo_title")),
    seo_keywords: orNull(str("seo_keywords")),
    seo_description: orNull(str("seo_description")),
    head_code: orNull(str("head_code")),
  }
}

/**
 * Resolve the final slug value from the raw input + name.
 * - blank input  → generate from name; if name yields nothing (pure Chinese),
 *   store null and let the admin add a slug later.
 * - provided     → must be URL-safe.
 */
function resolveSlug(rawSlug: string, name: string): { slug: string | null } | { error: string } {
  if (rawSlug === "") {
    const generated = slugify(name)
    return { slug: generated === "" ? null : generated }
  }
  if (!isValidSlug(rawSlug)) {
    return { error: "自訂網址格式不正確，僅能使用小寫英文、數字與連字號（-），且不可以連字號開頭或結尾。" }
  }
  return { slug: rawSlug }
}

/** Upload a category image to case-categories/{id}/... and return its public URL. */
async function uploadCategoryImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
  const path = `case-categories/${categoryId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined })

  if (uploadError) {
    return { error: `圖片上傳失敗：${uploadError.message}` }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const fields = readFields(formData)
  if (fields.name === "") {
    return { ok: false, error: "請輸入選項名稱。" }
  }

  const slugResult = resolveSlug(fields.rawSlug, fields.name)
  if ("error" in slugResult) return { ok: false, error: slugResult.error }
  const slug = slugResult.slug

  // Uniqueness pre-check (the DB unique constraint is the final guard).
  if (slug) {
    const { data: existing } = await supabase
      .from("case_categories")
      .select("id")
      .eq("slug", slug)
      .limit(1)
    if (existing && existing.length > 0) {
      return { ok: false, error: "此自訂網址已被使用，請改用其他網址。" }
    }
  }

  // New categories go to the end: highest current sort_order + 1.
  const { data: maxRows } = await supabase
    .from("case_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
  const nextSortOrder = maxRows && maxRows.length > 0 ? (maxRows[0].sort_order ?? 0) + 1 : 0

  const { data: inserted, error: insertError } = await supabase
    .from("case_categories")
    .insert({
      name: fields.name,
      seo_title: fields.seo_title,
      seo_keywords: fields.seo_keywords,
      seo_description: fields.seo_description,
      head_code: fields.head_code,
      slug,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "此自訂網址已被使用，請改用其他網址。" }
    }
    return { ok: false, error: `建立分類失敗：${insertError?.message ?? "未知錯誤"}` }
  }

  // Image is uploaded only AFTER the row exists, so it can be namespaced by id.
  const file = formData.get("image")
  if (file instanceof File && file.size > 0) {
    const upload = await uploadCategoryImage(supabase, inserted.id, file)
    if ("error" in upload) {
      // The category was created; surface the image error without losing it.
      revalidatePath(LIST_PATH)
      return { ok: false, error: `${upload.error}（分類已建立，請於編輯頁重新上傳圖片）` }
    }
    await supabase
      .from("case_categories")
      .update({ image_url: upload.url })
      .eq("id", inserted.id)
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id: inserted.id }
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const fields = readFields(formData)
  if (fields.name === "") {
    return { ok: false, error: "請輸入選項名稱。" }
  }

  const slugResult = resolveSlug(fields.rawSlug, fields.name)
  if ("error" in slugResult) return { ok: false, error: slugResult.error }
  const slug = slugResult.slug

  // Uniqueness pre-check excluding this row.
  if (slug) {
    const { data: existing } = await supabase
      .from("case_categories")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .limit(1)
    if (existing && existing.length > 0) {
      return { ok: false, error: "此自訂網址已被使用，請改用其他網址。" }
    }
  }

  const updatePayload: Record<string, unknown> = {
    name: fields.name,
    seo_title: fields.seo_title,
    seo_keywords: fields.seo_keywords,
    seo_description: fields.seo_description,
    head_code: fields.head_code,
    slug,
    // NOTE: sort_order is intentionally NOT modified here (belongs to 分類排序).
  }

  const file = formData.get("image")
  if (file instanceof File && file.size > 0) {
    const upload = await uploadCategoryImage(supabase, id, file)
    if ("error" in upload) return { ok: false, error: upload.error }
    updatePayload.image_url = upload.url
  }

  const { error: updateError } = await supabase
    .from("case_categories")
    .update(updatePayload)
    .eq("id", id)

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, error: "此自訂網址已被使用，請改用其他網址。" }
    }
    return { ok: false, error: `更新分類失敗：${updateError.message}` }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // FK is ON DELETE RESTRICT — never bypass it. Block deletion when cases exist.
  const { count, error: countError } = await supabase
    .from("case_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)

  if (countError) {
    return { ok: false, error: `無法確認分類內案例數量：${countError.message}` }
  }
  if (count && count > 0) {
    return {
      ok: false,
      error: `此分類尚有 ${count} 筆案例，請先將案例移至其他分類或刪除後，才能刪除此分類。`,
    }
  }

  // Best-effort cleanup of this category's OWN image folder only (scoped by id,
  // so no shared/unrelated Storage objects are touched). Ignore any errors.
  try {
    const prefix = `case-categories/${id}`
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix)
    if (files && files.length > 0) {
      await supabase.storage
        .from(BUCKET)
        .remove(files.map((f) => `${prefix}/${f.name}`))
    }
  } catch {
    // Non-fatal: storage cleanup failure must not block category deletion.
  }

  const { error: deleteError } = await supabase
    .from("case_categories")
    .delete()
    .eq("id", id)

  if (deleteError) {
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error: "此分類仍有關聯案例，無法刪除。請先處理分類內的案例。",
      }
    }
    return { ok: false, error: `刪除分類失敗：${deleteError.message}` }
  }

  revalidatePath(LIST_PATH)
  return { ok: true }
}
