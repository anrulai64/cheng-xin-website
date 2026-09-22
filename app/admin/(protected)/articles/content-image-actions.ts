"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { ARTICLE_IMAGE_BUCKET } from "@/lib/admin/articles/cover-image"
import {
  buildArticleContentImageStoragePath,
  validateContentImageFile,
} from "@/lib/admin/articles/content-image"

export type UploadResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Upload a single inline image for use INSIDE the rich-text content of an
 * Article (STEP A10-F). Stored in the existing `article-images` bucket,
 * under a namespace dedicated to this feature and completely separate from
 * the cover image:
 *
 *   articles/{articleId}/content/{timestamp-uuid.ext}
 *
 * Returns the public URL so the editor can insert <img src="..." alt="...">
 * into the HTML. Only available on edit pages, because a real Article id
 * must already exist — this action explicitly verifies that before writing
 * anything to Storage, so an arbitrary client-supplied id can never create a
 * Storage namespace for a non-existent Article.
 */
export async function uploadArticleContentImage(articleId: string, form: FormData): Promise<UploadResult> {
  await requireAdmin()

  if (typeof articleId !== "string" || articleId.trim() === "") {
    return { ok: false, error: "文章識別碼無效，請先儲存文章後再插入圖片。" }
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "請選擇要上傳的圖片檔案。" }
  }

  const validation = validateContentImageFile(file)
  if (!validation.ok) {
    return { ok: false, error: validation.error }
  }

  const supabase = await createClient()

  // Confirm the Article exists / is visible under RLS before writing into
  // its content namespace. This is validation only — the Article row is
  // never modified here.
  const { data: existing, error: fetchError } = await supabase
    .from("articles")
    .select("id")
    .eq("id", articleId)
    .single()
  if (fetchError || !existing) {
    return { ok: false, error: "找不到對應的文章，無法上傳圖片。" }
  }

  const path = buildArticleContentImageStoragePath(articleId, validation.ext)

  const { error: uploadError } = await supabase.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { ok: false, error: `圖片上傳失敗：${uploadError.message}` }
  }

  const { data: pub } = supabase.storage.from(ARTICLE_IMAGE_BUCKET).getPublicUrl(path)
  if (!pub?.publicUrl) {
    // Roll back the orphaned file if we somehow can't resolve its URL.
    await supabase.storage.from(ARTICLE_IMAGE_BUCKET).remove([path])
    return { ok: false, error: "無法取得圖片公開網址，請再試一次。" }
  }

  return { ok: true, url: pub.publicUrl }
}
