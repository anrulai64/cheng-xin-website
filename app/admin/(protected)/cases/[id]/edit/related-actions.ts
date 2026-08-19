"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

export type RelatedResult = { ok: true; count: number } | { ok: false; error: string }

/**
 * Synchronize the related-case relationships for ONE case (directional:
 * current case -> related case), matching the actual schema:
 *   public.case_related_cases (case_id, related_case_id, sort_order, created_at)
 *   PK (case_id, related_case_id), both FK -> case_items ON DELETE CASCADE,
 *   CHECK (case_id <> related_case_id).
 *
 * Relationships are DIRECTIONAL: selecting B as related to A does NOT create a
 * reverse A-as-related-to-B row. Each case controls its own selection.
 *
 * Every operation is scoped strictly to `case_id = currentId`, so relationships
 * belonging to other cases are never touched.
 */
export async function saveRelatedCases(
  currentId: string,
  relatedIds: string[],
): Promise<RelatedResult> {
  await requireAdmin()

  if (typeof currentId !== "string" || currentId.trim() === "") {
    return { ok: false, error: "案例識別碼無效。" }
  }

  // 1. Normalize client input: keep strings, drop blanks, remove the current
  //    case id (no self-reference), and de-duplicate.
  const desired = Array.isArray(relatedIds)
    ? [
        ...new Set(
          relatedIds
            .filter((v): v is string => typeof v === "string" && v.trim() !== "")
            .map((v) => v.trim()),
        ),
      ].filter((id) => id !== currentId)
    : []

  const supabase = await createClient()

  // 2. Confirm the current case actually exists (under RLS / is_admin()).
  const { data: current, error: currentError } = await supabase
    .from("case_items")
    .select("id")
    .eq("id", currentId)
    .single()

  if (currentError || !current) {
    return { ok: false, error: "找不到目前的案例，請重新整理後再試。" }
  }

  // 3. Validate every submitted related id actually exists. Never trust
  //    client-supplied ids blindly; a nonexistent id must abort the save.
  let validDesired: string[] = []
  if (desired.length > 0) {
    const { data: existing, error: existErr } = await supabase
      .from("case_items")
      .select("id")
      .in("id", desired)

    if (existErr) {
      return { ok: false, error: `無法驗證所選案例：${existErr.message}` }
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id))
    const missing = desired.filter((id) => !existingIds.has(id))
    if (missing.length > 0) {
      return { ok: false, error: "部分所選案例已不存在，請重新整理後再試。" }
    }
    validDesired = desired
  }

  // 4. Read the current relationships for THIS case only.
  const { data: currentRows, error: readErr } = await supabase
    .from("case_related_cases")
    .select("related_case_id")
    .eq("case_id", currentId)

  if (readErr) {
    return { ok: false, error: `無法讀取現有相關案例：${readErr.message}` }
  }

  const currentSet = new Set((currentRows ?? []).map((r) => r.related_case_id))
  const desiredSet = new Set(validDesired)

  const toAdd = validDesired.filter((id) => !currentSet.has(id))
  const toRemove = [...currentSet].filter((id) => !desiredSet.has(id))

  // 5. Remove relationships that are no longer selected (scoped to this case).
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("case_related_cases")
      .delete()
      .eq("case_id", currentId)
      .in("related_case_id", toRemove)

    if (delErr) {
      return { ok: false, error: `移除舊的相關案例時發生錯誤：${delErr.message}` }
    }
  }

  // 6. Add newly selected relationships. sort_order reflects the submitted order
  //    among the desired ids, so the admin's ordering is preserved for new rows.
  if (toAdd.length > 0) {
    const orderIndex = new Map(validDesired.map((id, i) => [id, i]))
    const rows = toAdd.map((related_case_id) => ({
      case_id: currentId,
      related_case_id,
      sort_order: orderIndex.get(related_case_id) ?? 0,
    }))

    // upsert with ignoreDuplicates respects the existing PK (case_id,
    // related_case_id) so a concurrent duplicate can never create a dupe row.
    const { error: insErr } = await supabase
      .from("case_related_cases")
      .upsert(rows, { onConflict: "case_id,related_case_id", ignoreDuplicates: true })

    if (insErr) {
      return { ok: false, error: `新增相關案例時發生錯誤：${insErr.message}` }
    }
  }

  revalidatePath(`/admin/cases/${currentId}/edit`)
  return { ok: true, count: validDesired.length }
}
