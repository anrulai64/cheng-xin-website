"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import {
  ARTICLE_IMAGE_BUCKET as BUCKET,
  buildArticleCoverStoragePath,
  isOwnedArticleCoverPath,
  validateCoverFile,
} from "@/lib/admin/articles/cover-image"

const LIST_PATH = "/admin/articles"

export type CoverActionResult = { ok: true } | { ok: false; error: string }

function revalidateAdmin(articleId: string) {
  // Public cover rendering is NOT wired up yet (A7-C), so we deliberately
  // revalidate ONLY the Admin surfaces — never /blog, /blog/{slug}, or the
  // sitemap (A7-B2 §24).
  revalidatePath(LIST_PATH)
  revalidatePath(`/admin/articles/${articleId}/edit`)
}

/**
 * Upload OR replace an Article's cover image (STEP A7-B2).
 *
 * The client may only submit `article_id` + `file`. cover_image_path and
 * cover_image_url are NEVER accepted from the client — the server generates
 * both trusted values itself.
 *
 * NEW-COVER lifecycle (no existing cover):
 *   requireAdmin → validate Article → validate file → build trusted path →
 *   upload (upsert:false) → getPublicUrl → UPDATE row {path,url}.
 *   If Storage upload fails: DB is not touched.
 *   If DB update fails: remove the just-uploaded object (orphan-safe).
 *
 * REPLACE lifecycle (existing cover present):
 *   upload NEW object FIRST → getPublicUrl → UPDATE row to NEW {path,url} →
 *   only AFTER DB success, remove the OLD object (ownership-verified).
 *   If NEW upload fails: old cover fully preserved.
 *   If DB update fails: remove the NEW object; old DB state + old object kept.
 *   If OLD-object cleanup fails: the NEW cover is authoritative — DB is NOT
 *   rolled back; the failure is logged and reported as partial success.
 */
export async function uploadArticleCoverImage(formData: FormData): Promise<CoverActionResult> {
  await requireAdmin()

  const articleId = (() => {
    const v = formData.get("article_id")
    return typeof v === "string" ? v.trim() : ""
  })()
  if (articleId === "") {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  const fileEntry = formData.get("file")
  if (!(fileEntry instanceof File)) {
    return { ok: false, error: "請選擇要上傳的圖片。" }
  }

  // Authoritative server-side file validation (size + MIME → trusted ext).
  const validation = validateCoverFile(fileEntry)
  if (!validation.ok) {
    return { ok: false, error: validation.error }
  }

  const supabase = await createClient()

  // Article identity check — read only the minimal fields. slug/title are
  // never accepted as identity.
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, cover_image_path, cover_image_url")
    .eq("id", articleId)
    .single()

  if (articleError || !article) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  const oldPath = article.cover_image_path

  // Build a fresh trusted path for the NEW object (never upsert/overwrite).
  const newPath = buildArticleCoverStoragePath(articleId, validation.ext)

  // 1. Upload the NEW object first (works for both new-cover and replace).
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, fileEntry, { upsert: false, contentType: fileEntry.type || undefined })

  if (uploadError) {
    console.error("[v0] cover upload: storage upload failed", uploadError)
    // Storage failed → DB untouched, existing cover (if any) fully preserved.
    return { ok: false, error: "圖片上傳失敗，請稍後再試。" }
  }

  // 2. Trusted public URL derived from the path (never client-supplied).
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath)
  const newUrl = urlData.publicUrl

  // 3. Point the Article at the NEW object (single write of both columns).
  const { data: updated, error: updateError } = await supabase
    .from("articles")
    .update({ cover_image_path: newPath, cover_image_url: newUrl })
    .eq("id", articleId)
    .select("id")

  if (updateError || !updated || updated.length === 0) {
    console.error("[v0] cover upload: DB update failed, cleaning up new object", updateError)
    // Roll back the just-uploaded object so no orphan is left behind. Old
    // cover (if any) stays authoritative in the DB and in Storage.
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([newPath])
    if (cleanupError) {
      console.error("[v0] cover upload: orphan cleanup ALSO failed", newPath, cleanupError)
    }
    return { ok: false, error: "圖片上傳失敗，請稍後再試。" }
  }

  // 4. REPLACE only: DB now points at the NEW cover, so it is safe to remove
  //    the OLD object. Verify ownership first — never delete a path outside
  //    this Article's namespace (guards against another Article/Case/bucket).
  if (isOwnedArticleCoverPath(oldPath, articleId) && oldPath !== newPath) {
    const { error: oldRemoveError } = await supabase.storage.from(BUCKET).remove([oldPath as string])
    if (oldRemoveError) {
      // Core replace already succeeded; do NOT roll back the DB to the old
      // cover. Report partial success so the leftover object can be noticed.
      console.error("[v0] cover replace: old object cleanup failed (orphan)", oldPath, oldRemoveError)
      revalidateAdmin(articleId)
      return { ok: false, error: "封面已更新，但舊圖片檔案清理失敗，請稍後再試或聯絡管理員。" }
    }
  } else if (oldPath && !isOwnedArticleCoverPath(oldPath, articleId)) {
    // Existing DB path is outside this Article's namespace — anomalous. Never
    // delete it; the new cover is already authoritative.
    console.error("[v0] cover replace: existing path not owned by article, skipping delete", articleId, oldPath)
  }

  revalidateAdmin(articleId)
  return { ok: true }
}

/**
 * Remove an Article's cover image (STEP A7-B2).
 *
 * Client may only submit `article_id`. Lifecycle:
 *   requireAdmin → fetch {path,url} → if both null: idempotent success →
 *   verify ownership → UPDATE row {path:null,url:null} FIRST → only after DB
 *   success remove the exact Storage object.
 *
 * If DB update fails: Storage is not touched.
 * If Storage remove fails: DB stays null (no broken pointer); the leftover is
 *   logged as an orphan and reported as partial success.
 *
 * cover_alt is deliberately PRESERVED (A7-B2 §18) — alt is an editorial field.
 */
export async function removeArticleCoverImage(formData: FormData): Promise<CoverActionResult> {
  await requireAdmin()

  const articleId = (() => {
    const v = formData.get("article_id")
    return typeof v === "string" ? v.trim() : ""
  })()
  if (articleId === "") {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  const supabase = await createClient()

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, cover_image_path, cover_image_url")
    .eq("id", articleId)
    .single()

  if (articleError || !article) {
    return { ok: false, error: "文章不存在或已被刪除。" }
  }

  const oldPath = article.cover_image_path

  // Nothing to remove → idempotent success (cover_alt untouched).
  if (!article.cover_image_path && !article.cover_image_url) {
    return { ok: true }
  }

  // Null the authoritative pointers FIRST so nothing keeps referencing the
  // object, even if the Storage delete later fails.
  const { data: updated, error: updateError } = await supabase
    .from("articles")
    .update({ cover_image_path: null, cover_image_url: null })
    .eq("id", articleId)
    .select("id")

  if (updateError || !updated || updated.length === 0) {
    console.error("[v0] cover remove: DB update failed, storage untouched", updateError)
    return { ok: false, error: "移除封面失敗，請稍後再試。" }
  }

  // Only delete the exact, ownership-verified object. A path outside this
  // Article's namespace is never deleted.
  if (isOwnedArticleCoverPath(oldPath, articleId)) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldPath as string])
    if (removeError) {
      // DB is already null (correct authoritative state); the object is now an
      // orphan. Report partial success rather than restoring the pointer.
      console.error("[v0] cover remove: storage delete failed (orphan left)", oldPath, removeError)
      revalidateAdmin(articleId)
      return { ok: false, error: "封面已移除，但圖片檔案清理失敗，請稍後再試或聯絡管理員。" }
    }
  } else if (oldPath) {
    console.error("[v0] cover remove: existing path not owned by article, skipping delete", articleId, oldPath)
  }

  revalidateAdmin(articleId)
  return { ok: true }
}
