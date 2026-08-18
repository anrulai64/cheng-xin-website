"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { isValidSlug } from "@/lib/admin/cases/slug"

const BUCKET = "case-images"
const LIST_PATH = "/admin/cases"

const VALID_STATUSES = ["sale", "display", "offline"] as const

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string }
export type BulkResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string; deleted?: number }

/**
 * Parse and validate the shared case_items form payload (used by both create
 * and update). Returns either a normalized column object ready for insert/
 * update, or a Traditional-Chinese error message. Never touches sort_order,
 * created_at, or id — those are managed elsewhere / by the DB.
 */
type CasePayload = {
  category_id: string
  name: string
  short_description: string | null
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  head_code: string | null
  slug: string | null
  price: number | null
  original_price: number | null
  is_home: boolean
  is_new: boolean
  is_hot: boolean
  is_recommended: boolean
  publish_start: string | null
  publish_end: string | null
  status: string
  description_html: string | null
  detail_html: string
  note: string | null
  specification_type: string
  specification_description: string | null
  case_code: string
  stock_quantity: number | null
  safety_stock: number | null
  shipping_rule: string | null
}

function str(form: FormData, key: string): string {
  const v = form.get(key)
  return typeof v === "string" ? v.trim() : ""
}

function nullableStr(form: FormData, key: string): string | null {
  const v = str(form, key)
  return v === "" ? null : v
}

/** Parse an optional decimal (price). Returns undefined on invalid input. */
function parseOptionalNumber(raw: string): number | null | undefined {
  if (raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

/** Parse an optional non-negative integer (stock). undefined on invalid input. */
function parseOptionalInt(raw: string): number | null | undefined {
  if (raw === "") return null
  if (!/^\d+$/.test(raw)) return undefined
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

function parseCaseForm(form: FormData): { ok: true; data: CasePayload } | { ok: false; error: string } {
  const category_id = str(form, "category_id")
  const name = str(form, "name")
  const detail_html = str(form, "detail_html")
  const specification_type = str(form, "specification_type")
  const case_code = str(form, "case_code")

  if (!category_id) return { ok: false, error: "請選擇分類。" }
  if (!name) return { ok: false, error: "請輸入案例名稱。" }
  if (!specification_type) return { ok: false, error: "請輸入規格種類。" }
  if (!case_code) return { ok: false, error: "請輸入案例編號。" }
  if (!detail_html) return { ok: false, error: "請輸入案例詳細內容。" }

  const slug = nullableStr(form, "slug")
  if (slug !== null && !isValidSlug(slug)) {
    return { ok: false, error: "自訂網址格式不正確：僅能使用小寫英文、數字與連字號（-）。" }
  }

  const status = str(form, "status") || "display"
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "狀態值不正確。" }
  }

  const price = parseOptionalNumber(str(form, "price"))
  if (price === undefined) return { ok: false, error: "案例售價必須為 0 以上的數字。" }
  const original_price = parseOptionalNumber(str(form, "original_price"))
  if (original_price === undefined) return { ok: false, error: "案例原價必須為 0 以上的數字。" }

  const stock_quantity = parseOptionalInt(str(form, "stock_quantity"))
  if (stock_quantity === undefined) return { ok: false, error: "案例庫存必須為 0 以上的整數。" }
  const safety_stock = parseOptionalInt(str(form, "safety_stock"))
  if (safety_stock === undefined) return { ok: false, error: "安全庫存必須為 0 以上的整數。" }

  const publish_start = nullableStr(form, "publish_start")
  const publish_end = nullableStr(form, "publish_end")
  if (publish_start && publish_end && publish_end < publish_start) {
    return { ok: false, error: "下架日期不可早於上架日期。" }
  }

  return {
    ok: true,
    data: {
      category_id,
      name,
      short_description: nullableStr(form, "short_description"),
      seo_title: nullableStr(form, "seo_title"),
      seo_keywords: nullableStr(form, "seo_keywords"),
      seo_description: nullableStr(form, "seo_description"),
      head_code: nullableStr(form, "head_code"),
      slug,
      price,
      original_price,
      is_home: form.get("is_home") === "on" || form.get("is_home") === "true",
      is_new: form.get("is_new") === "on" || form.get("is_new") === "true",
      is_hot: form.get("is_hot") === "on" || form.get("is_hot") === "true",
      is_recommended: form.get("is_recommended") === "on" || form.get("is_recommended") === "true",
      publish_start,
      publish_end,
      status,
      description_html: nullableStr(form, "description_html"),
      detail_html,
      note: nullableStr(form, "note"),
      specification_type,
      specification_description: nullableStr(form, "specification_description"),
      case_code,
      stock_quantity,
      safety_stock,
      shipping_rule: nullableStr(form, "shipping_rule"),
    },
  }
}

/** Map a unique-constraint violation to a friendly field-specific message. */
function uniqueError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("slug")) return "自訂網址已被使用，請改用其他網址。"
  if (m.includes("case_code")) return "案例編號已被使用，請改用其他編號。"
  return "資料重複，請檢查自訂網址與案例編號是否已存在。"
}

/** Create a new case_items record. */
export async function createCase(form: FormData): Promise<ActionResult> {
  await requireAdmin()

  const parsed = parseCaseForm(form)
  if (!parsed.ok) return parsed

  const supabase = await createClient()

  // Append new records to the end of the current ordering.
  const { data: maxRows } = await supabase
    .from("case_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
  const nextSortOrder = maxRows && maxRows.length > 0 ? (maxRows[0].sort_order ?? 0) + 1 : 0

  const { data: inserted, error } = await supabase
    .from("case_items")
    .insert({ ...parsed.data, sort_order: nextSortOrder })
    .select("id")
    .single()

  if (error || !inserted) {
    if (error?.code === "23505") return { ok: false, error: uniqueError(error.message) }
    return { ok: false, error: `新增案例失敗：${error?.message ?? "未知錯誤"}` }
  }

  revalidatePath(LIST_PATH)
  return { ok: true, id: inserted.id }
}

/**
 * Update an existing case_items record. Never writes sort_order or created_at;
 * updated_at is maintained automatically by the DB trigger.
 */
export async function updateCase(id: string, form: FormData): Promise<ActionResult> {
  await requireAdmin()
  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "案例識別碼無效。" }
  }

  const parsed = parseCaseForm(form)
  if (!parsed.ok) return parsed

  const supabase = await createClient()

  const { error } = await supabase.from("case_items").update(parsed.data).eq("id", id)

  if (error) {
    if (error.code === "23505") return { ok: false, error: uniqueError(error.message) }
    return { ok: false, error: `更新案例失敗：${error.message}` }
  }

  revalidatePath(LIST_PATH)
  revalidatePath(`/admin/cases/${id}/edit`)
  return { ok: true, id }
}

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
