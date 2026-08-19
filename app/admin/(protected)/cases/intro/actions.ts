"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { isHtmlContentEmpty } from "@/lib/admin/cases/html"

const INTRO_PATH = "/admin/cases/intro"

export type IntroSaveResult = { ok: true } | { ok: false; error: string }

/**
 * Save the shared/global Case Study intro content (legacy「商品介紹文字」).
 *
 * Singleton model: the table `public.case_intro_content` has a partial unique
 * index enforcing at most ONE row with is_visible = true. We treat that single
 * visible row as the singleton:
 *   - if it exists  -> UPDATE it
 *   - if it doesn't  -> INSERT one (is_visible = true)
 *
 * content_html is nullable in the schema, so empty content is allowed and is
 * stored as NULL (we do not invent a "required" business rule).
 */
export async function saveCaseIntroContent(form: FormData): Promise<IntroSaveResult> {
  await requireAdmin()

  const raw = form.get("content_html")
  const html = typeof raw === "string" ? raw : ""

  // Normalize visually-empty HTML (e.g. "<p></p>") to NULL, since the column
  // is nullable and empty content is permitted for this shared block.
  const contentValue = isHtmlContentEmpty(html) ? null : html

  const supabase = await createClient()

  // Locate the singleton (the one visible row).
  const { data: existing, error: selectError } = await supabase
    .from("case_intro_content")
    .select("id")
    .eq("is_visible", true)
    .maybeSingle()

  if (selectError) {
    return { ok: false, error: `讀取現有內容時發生錯誤：${selectError.message}` }
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("case_intro_content")
      .update({ content_html: contentValue })
      .eq("id", existing.id)

    if (updateError) {
      return { ok: false, error: `更新案例介紹文字失敗：${updateError.message}` }
    }
  } else {
    const { error: insertError } = await supabase
      .from("case_intro_content")
      .insert({ content_html: contentValue, is_visible: true })

    // If a concurrent insert created the visible row first, the partial unique
    // index will reject this insert; surface a clear, safe message instead of
    // creating a second row.
    if (insertError) {
      if (insertError.code === "23505") {
        return {
          ok: false,
          error: "偵測到內容已由其他操作建立，請重新整理頁面後再儲存一次。",
        }
      }
      return { ok: false, error: `建立案例介紹文字失敗：${insertError.message}` }
    }
  }

  revalidatePath(INTRO_PATH)
  return { ok: true }
}
