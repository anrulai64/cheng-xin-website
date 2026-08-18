"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

const BUCKET = "case-images"
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB, matching the bucket policy.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]

export type UploadResult = { ok: true; url: string } | { ok: false; error: string }

/**
 * Upload a single inline image for use INSIDE the rich-text content of a case.
 * Stored separately from the STEP 7 gallery, under:
 *
 *   case-items/{caseId}/content/{timestamp-random.ext}
 *
 * Returns the public URL so the editor can insert <img src="..."> into the HTML.
 * Only available on edit pages, because a real case id must already exist.
 */
export async function uploadContentImage(caseId: string, form: FormData): Promise<UploadResult> {
  await requireAdmin()

  if (typeof caseId !== "string" || caseId.trim() === "") {
    return { ok: false, error: "案例識別碼無效，請先儲存案例後再插入圖片。" }
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "請選擇要上傳的圖片檔案。" }
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: "圖片格式不支援，僅接受 JPG、PNG、WebP、GIF 或 AVIF。" }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "圖片檔案過大，請上傳 8MB 以內的圖片。" }
  }

  const supabase = await createClient()

  // Confirm the case exists / is visible under RLS before writing to its folder.
  const { data: existing, error: fetchError } = await supabase
    .from("case_items")
    .select("id")
    .eq("id", caseId)
    .single()
  if (fetchError || !existing) {
    return { ok: false, error: "找不到對應的案例，無法上傳圖片。" }
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
  const path = `case-items/${caseId}/content/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { ok: false, error: `圖片上傳失敗：${uploadError.message}` }
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!pub?.publicUrl) {
    // Roll back the orphaned file if we somehow can't resolve its URL.
    await supabase.storage.from(BUCKET).remove([path])
    return { ok: false, error: "無法取得圖片公開網址，請再試一次。" }
  }

  return { ok: true, url: pub.publicUrl }
}
