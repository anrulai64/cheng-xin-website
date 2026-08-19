"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const LIST_PATH = "/admin/cases"
const SORT_PATH = "/admin/cases/sort"

export type ReorderResult = { ok: true } | { ok: false; error: string }

/**
 * Persist a new case ordering WITHIN a single category.
 *
 * `categoryId` scopes the operation; `orderedIds` is the full list of case ids
 * for that category in the desired top-to-bottom order. Each row's sort_order
 * is rewritten to its sequential index (0,1,2…), restarting from 0 per category.
 *
 * Safety:
 * - re-checks admin (defense in depth on top of the layout guard + RLS)
 * - verifies the selected category exists
 * - validates the submitted id set against the LIVE set of cases for THAT
 *   category, so a stale client (case added/deleted/moved elsewhere) cannot
 *   corrupt ordering or silently save a partial order
 * - rejects ids that belong to another category or don't exist
 * - only touches sort_order; never category_id/name/slug/case_code/status/SEO/
 *   publication/content/images/related cases
 * - reports partial failure honestly instead of pretending success
 */
export async function reorderCasesInCategory(
  categoryId: string,
  orderedIds: string[],
): Promise<ReorderResult> {
  await requireAdmin()

  if (typeof categoryId !== "string" || categoryId.trim() === "") {
    return { ok: false, error: "尚未選擇分類，無法儲存排序。" }
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "沒有可儲存的排序資料。" }
  }

  // Reject duplicate / blank ids in the submitted order up front.
  const cleaned = orderedIds.filter((v): v is string => typeof v === "string" && v.trim() !== "")
  const submittedIds = new Set(cleaned)
  if (cleaned.length !== orderedIds.length || submittedIds.size !== cleaned.length) {
    return { ok: false, error: "排序資料不正確（含有重複或空白項目），請重新整理頁面後再試。" }
  }

  const supabase = await createClient()

  // Verify the selected category exists.
  const { data: category, error: catError } = await supabase
    .from("case_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle()

  if (catError) {
    return { ok: false, error: `無法讀取分類資料：${catError.message}` }
  }
  if (!category) {
    return { ok: false, error: "所選分類已不存在，請重新整理頁面後再選擇分類。" }
  }

  // Load the authoritative current set of case ids for THIS category.
  const { data: liveRows, error: loadError } = await supabase
    .from("case_items")
    .select("id")
    .eq("category_id", categoryId)

  if (loadError || !liveRows) {
    return { ok: false, error: `無法讀取案例資料：${loadError?.message ?? "未知錯誤"}` }
  }

  const liveIds = new Set(liveRows.map((r) => r.id))

  // The submitted ordering must describe exactly the current cases of this
  // category — no missing rows, no unknown ids (which would include any id
  // belonging to another category). Otherwise the client is stale.
  const sameSize = submittedIds.size === liveIds.size
  const sameMembers = [...submittedIds].every((id) => liveIds.has(id))

  if (!sameSize || !sameMembers) {
    return {
      ok: false,
      error:
        "案例資料已變更（可能在其他頁面新增、刪除或變更了案例的分類），請重新整理頁面後再儲存。",
    }
  }

  // Rewrite sort_order sequentially, scoped to this category. Every update is
  // additionally guarded by category_id so a moved row can never be written.
  const results = await Promise.all(
    cleaned.map((id, index) =>
      supabase
        .from("case_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("category_id", categoryId),
    ),
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return {
      ok: false,
      error: `排序儲存時發生錯誤，部分項目可能未更新：${failed.error.message}。請重新整理頁面確認目前順序後再試一次。`,
    }
  }

  revalidatePath(SORT_PATH)
  revalidatePath(LIST_PATH)
  return { ok: true }
}
