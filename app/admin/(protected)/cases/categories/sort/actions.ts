"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const LIST_PATH = "/admin/cases/categories"
const SORT_PATH = "/admin/cases/categories/sort"

export type ReorderResult = { ok: true } | { ok: false; error: string }

/**
 * Persist a new category ordering.
 *
 * `orderedIds` is the full list of category ids in the desired top-to-bottom
 * order. Each row's sort_order is rewritten to its sequential index (0,1,2…).
 *
 * Safety:
 * - re-checks admin (defense in depth on top of the layout guard + RLS)
 * - validates the submitted id set against the LIVE set of categories, so a
 *   stale client (added/removed category elsewhere) cannot corrupt ordering
 * - only touches sort_order; never name/slug/SEO/image_url/created_at
 * - reports partial failure honestly instead of pretending success
 */
export async function reorderCategories(orderedIds: string[]): Promise<ReorderResult> {
  await requireAdmin()
  const supabase = await createClient()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "沒有可儲存的排序資料。" }
  }

  // Load the authoritative current set of category ids.
  const { data: liveRows, error: loadError } = await supabase
    .from("case_categories")
    .select("id")

  if (loadError || !liveRows) {
    return { ok: false, error: `無法讀取分類資料：${loadError?.message ?? "未知錯誤"}` }
  }

  const liveIds = new Set(liveRows.map((r) => r.id))
  const submittedIds = new Set(orderedIds)

  // The submitted ordering must describe exactly the current categories — no
  // missing rows, no unknown/duplicate ids. Otherwise the data is stale.
  const sameSize =
    submittedIds.size === orderedIds.length && submittedIds.size === liveIds.size
  const sameMembers = [...submittedIds].every((id) => liveIds.has(id))

  if (!sameSize || !sameMembers) {
    return {
      ok: false,
      error: "分類資料已變更（可能在其他頁面新增或刪除了分類），請重新整理頁面後再儲存。",
    }
  }

  // Rewrite sort_order sequentially. Run updates and detect any failure; if any
  // single update fails, do not report overall success.
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("case_categories")
        .update({ sort_order: index })
        .eq("id", id),
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
