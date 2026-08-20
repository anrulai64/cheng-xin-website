"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { isHtmlContentEmpty } from "@/lib/admin/cases/html"

const FAQ_PATH = "/admin/cases/faq"

export type FaqMutationResult = { ok: true } | { ok: false; error: string }

/**
 * Shared Case Study FAQ (public.case_faqs). This collection is NOT per-case; it
 * powers the「常見問題」tab across all Case Study detail pages.
 *
 * All mutations re-check admin (defense in depth on top of the layout guard and
 * RLS) and never use service_role. `answer_html` is validated with the shared
 * isHtmlContentEmpty() so visually-empty HTML ("<p></p>", "<p><br></p>") is
 * rejected. Error messages are Traditional Chinese only.
 */

/** Validate + normalize the submitted question / answer_html. */
function parseFaqForm(
  form: FormData,
): { ok: true; question: string; answerHtml: string } | { ok: false; error: string } {
  const rawQuestion = form.get("question")
  const rawAnswer = form.get("answer_html")

  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : ""
  const answerHtml = typeof rawAnswer === "string" ? rawAnswer : ""

  if (question === "") {
    return { ok: false, error: "請輸入問題。" }
  }
  if (isHtmlContentEmpty(answerHtml)) {
    return { ok: false, error: "請輸入答案內容。" }
  }

  return { ok: true, question, answerHtml }
}

/**
 * Create a new FAQ. New rows are appended to the END of the list: sort_order is
 * set to (current max sort_order) + 1 so existing order is untouched.
 */
export async function createCaseFaq(form: FormData): Promise<FaqMutationResult> {
  await requireAdmin()

  const parsed = parseFaqForm(form)
  if (!parsed.ok) return parsed

  const supabase = await createClient()

  // Determine the next sort_order (append to the end).
  const { data: last, error: maxError } = await supabase
    .from("case_faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) {
    return { ok: false, error: `讀取排序資料時發生錯誤：${maxError.message}` }
  }

  const nextSortOrder = (last?.sort_order ?? -1) + 1

  const { error: insertError } = await supabase.from("case_faqs").insert({
    question: parsed.question,
    answer_html: parsed.answerHtml,
    sort_order: nextSortOrder,
    is_visible: true,
  })

  if (insertError) {
    return { ok: false, error: `新增問題失敗：${insertError.message}` }
  }

  revalidatePath(FAQ_PATH)
  return { ok: true }
}

/** Update an existing FAQ's question + answer_html (never touches sort_order). */
export async function updateCaseFaq(id: string, form: FormData): Promise<FaqMutationResult> {
  await requireAdmin()

  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "找不到要修改的問題。" }
  }

  const parsed = parseFaqForm(form)
  if (!parsed.ok) return parsed

  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from("case_faqs")
    .update({ question: parsed.question, answer_html: parsed.answerHtml })
    .eq("id", id)

  if (updateError) {
    return { ok: false, error: `修改問題失敗：${updateError.message}` }
  }

  revalidatePath(FAQ_PATH)
  return { ok: true }
}

/** Show / hide a FAQ without deleting it. */
export async function setCaseFaqVisibility(
  id: string,
  isVisible: boolean,
): Promise<FaqMutationResult> {
  await requireAdmin()

  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "找不到要更新的問題。" }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("case_faqs")
    .update({ is_visible: isVisible })
    .eq("id", id)

  if (error) {
    return { ok: false, error: `更新顯示狀態失敗：${error.message}` }
  }

  revalidatePath(FAQ_PATH)
  return { ok: true }
}

/** Delete exactly one FAQ by id. Affects no other case_* table. */
export async function deleteCaseFaq(id: string): Promise<FaqMutationResult> {
  await requireAdmin()

  if (typeof id !== "string" || id.trim() === "") {
    return { ok: false, error: "找不到要刪除的問題。" }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("case_faqs").delete().eq("id", id)

  if (error) {
    return { ok: false, error: `刪除問題失敗：${error.message}` }
  }

  revalidatePath(FAQ_PATH)
  return { ok: true }
}

/**
 * Persist a new FAQ ordering. `orderedIds` is the full list of FAQ ids in the
 * desired top-to-bottom order; each row's sort_order is rewritten to its
 * sequential index (0,1,2…). Validates the submitted id set against the LIVE
 * set so a stale client cannot corrupt ordering. Only sort_order is modified.
 */
export async function reorderCaseFaqs(orderedIds: string[]): Promise<FaqMutationResult> {
  await requireAdmin()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "沒有可儲存的排序資料。" }
  }

  const cleaned = orderedIds.filter((v): v is string => typeof v === "string" && v.trim() !== "")
  const submittedIds = new Set(cleaned)
  if (cleaned.length !== orderedIds.length || submittedIds.size !== cleaned.length) {
    return { ok: false, error: "排序資料不正確（含有重複或空白項目），請重新整理頁面後再試。" }
  }

  const supabase = await createClient()

  const { data: liveRows, error: loadError } = await supabase.from("case_faqs").select("id")

  if (loadError || !liveRows) {
    return { ok: false, error: `無法讀取常見問題資料：${loadError?.message ?? "未知錯誤"}` }
  }

  const liveIds = new Set(liveRows.map((r) => r.id))
  const sameSize = submittedIds.size === liveIds.size
  const sameMembers = [...submittedIds].every((id) => liveIds.has(id))

  if (!sameSize || !sameMembers) {
    return {
      ok: false,
      error: "常見問題資料已變更（可能在其他頁面新增或刪除了問題），請重新整理頁面後再儲存。",
    }
  }

  const results = await Promise.all(
    cleaned.map((id, index) =>
      supabase.from("case_faqs").update({ sort_order: index }).eq("id", id),
    ),
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return {
      ok: false,
      error: `排序儲存時發生錯誤，部分項目可能未更新：${failed.error.message}。請重新整理頁面確認目前順序後再試一次。`,
    }
  }

  revalidatePath(FAQ_PATH)
  return { ok: true }
}
