"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const BUCKET = "case-images"
const LIST_PATH = "/admin/cases"

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }
export type BulkResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string; deleted?: number }

/**
 * Best-effort cleanup of a single case's OWN image folder only. Strictly scoped
 * to `case-items/{caseId}/`, so no shared or unrelated Storage objects can be
 * touched. Any failure here is non-fatal and never blocks the DB delete.
 */
async function cleanupCaseStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
): Promise<void> {
  try {
    const prefix = `case-items/${caseId}`
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix)
    if (files && files.length > 0) {
      await supabase.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`))
    }
  } catch {
    // Non-fatal: physical Storage cleanup will be hardened in the later
    // case-image implementation STEP.
  }
}

/** Delete a single case. FK cascades remove case_images / case_related_cases rows. */
export async function deleteCase(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "案例識別碼無效。" }
  }
  const supabase = await createClient()

  const { error } = await supabase.from("case_items").delete().eq("id", id)
  if (error) {
    return { ok: false, error: `刪除案例失敗：${error.message}` }
  }

  // DB cascade only removes relationship rows — physical files are cleaned here.
  await cleanupCaseStorage(supabase, id)

  revalidatePath(LIST_PATH)
  return { ok: true }
}

/** Delete multiple selected cases. Reports partial failures honestly. */
export async function bulkDeleteCases(ids: string[]): Promise<BulkResult> {
  await requireAdmin()

  const cleanIds = Array.isArray(ids)
    ? [...new Set(ids.filter((v): v is string => typeof v === "string" && v.trim() !== ""))]
    : []

  if (cleanIds.length === 0) {
    return { ok: false, error: "尚未選取任何案例。" }
  }

  const supabase = await createClient()

  // Confirm which IDs actually exist / are visible under RLS before deleting.
  const { data: existing, error: fetchError } = await supabase
    .from("case_items")
    .select("id")
    .in("id", cleanIds)

  if (fetchError) {
    return { ok: false, error: `無法確認選取的案例：${fetchError.message}` }
  }

  const validIds = (existing ?? []).map((r) => r.id)
  if (validIds.length === 0) {
    return { ok: false, error: "選取的案例已不存在，請重新整理後再試。" }
  }

  const { error: deleteError, count } = await supabase
    .from("case_items")
    .delete({ count: "exact" })
    .in("id", validIds)

  if (deleteError) {
    return { ok: false, error: `批次刪除失敗：${deleteError.message}` }
  }

  // Best-effort per-id storage cleanup (strictly scoped to each case folder).
  for (const id of validIds) {
    await cleanupCaseStorage(supabase, id)
  }

  const deleted = count ?? validIds.length
  revalidatePath(LIST_PATH)

  // Honest partial-failure reporting.
  if (deleted < cleanIds.length) {
    return {
      ok: false,
      deleted,
      error: `已刪除 ${deleted} 筆，另有 ${cleanIds.length - deleted} 筆無法刪除（可能已被移除或無權限）。`,
    }
  }

  return { ok: true, deleted }
}

/**
 * Duplicate a case (legacy「複製商品」). Creates an independent new row based on
 * the original. Unique/identity fields are regenerated so DB constraints are
 * never violated:
 *   - id / created_at / updated_at : left to DB defaults
 *   - name      : original + "（複製）"
 *   - slug      : null (admin sets a real slug when editing)
 *   - case_code : internal, guaranteed-unique temporary value, clearly marked
 *                 as a copy (COPY-<timestamp>-<random>) — see final report
 * Storage images, case_images rows, and related-case links are intentionally
 * NOT copied in this STEP.
 */
export async function duplicateCase(id: string): Promise<ActionResult> {
  await requireAdmin()
  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "案例識別碼無效。" }
  }
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from("case_items")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !original) {
    return { ok: false, error: `找不到要複製的案例：${fetchError?.message ?? "資料不存在"}` }
  }

  // New rows go to the end of the list.
  const { data: maxRows } = await supabase
    .from("case_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
  const nextSortOrder = maxRows && maxRows.length > 0 ? (maxRows[0].sort_order ?? 0) + 1 : 0

  // Internal, clearly-marked, collision-safe temporary code.
  const copyCode = `COPY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const { data: inserted, error: insertError } = await supabase
    .from("case_items")
    .insert({
      category_id: original.category_id,
      name: `${original.name}（複製）`,
      short_description: original.short_description,
      seo_title: original.seo_title,
      seo_keywords: original.seo_keywords,
      seo_description: original.seo_description,
      head_code: original.head_code,
      slug: null,
      price: original.price,
      original_price: original.original_price,
      is_home: original.is_home,
      is_new: original.is_new,
      is_hot: original.is_hot,
      is_recommended: original.is_recommended,
      publish_start: original.publish_start,
      publish_end: original.publish_end,
      status: original.status,
      description_html: original.description_html,
      detail_html: original.detail_html,
      note: original.note,
      specification_type: original.specification_type,
      specification_description: original.specification_description,
      case_code: copyCode,
      stock_quantity: original.stock_quantity,
      safety_stock: original.safety_stock,
      shipping_rule: original.shipping_rule,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "複製失敗：案例編號重複，請再試一次。" }
    }
    return { ok: false, error: `複製案例失敗：${insertError?.message ?? "未知錯誤"}` }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id: inserted.id }
}
