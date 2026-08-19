"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"

// Bucket / limits / path strategy live in a shared, non-"use server" module so
// the create-page flow (actions.ts) reuses EXACTLY the same values and logic.
import {
  CASE_IMAGE_ALLOWED_TYPES as ALLOWED_TYPES,
  CASE_IMAGE_BUCKET as BUCKET,
  CASE_IMAGE_MAX_FILE_SIZE as MAX_FILE_SIZE,
  buildCaseImageStoragePath,
} from "@/lib/admin/cases/images"

export type ImageActionResult = { ok: true } | { ok: false; error: string }
export type UploadResult = {
  ok: boolean
  uploaded: number
  failed: number
  error?: string
}

function revalidateEdit(caseId: string) {
  revalidatePath(`/admin/cases/${caseId}/edit`)
}

/**
 * Upload one or more images for a case. Each file is handled independently:
 * on a DB-insert failure the just-uploaded Storage object is removed so no
 * orphan file is left behind. Partial success is reported honestly.
 */
export async function uploadCaseImages(caseId: string, formData: FormData): Promise<UploadResult> {
  await requireAdmin()

  if (typeof caseId !== "string" || caseId.trim() === "") {
    return { ok: false, uploaded: 0, failed: 0, error: "案例識別碼無效。" }
  }

  const supabase = await createClient()

  // Verify the case exists / is visible under RLS before uploading anything.
  const { data: parent, error: parentError } = await supabase
    .from("case_items")
    .select("id")
    .eq("id", caseId)
    .single()
  if (parentError || !parent) {
    return { ok: false, uploaded: 0, failed: 0, error: "找不到對應的案例，無法上傳圖片。" }
  }

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (files.length === 0) {
    return { ok: false, uploaded: 0, failed: 0, error: "請先選擇要上傳的圖片。" }
  }

  // Determine the current highest sort_order so new images append to the end.
  const { data: maxRows } = await supabase
    .from("case_images")
    .select("sort_order")
    .eq("case_id", caseId)
    .order("sort_order", { ascending: false })
    .limit(1)
  let nextSortOrder = maxRows && maxRows.length > 0 ? (maxRows[0].sort_order ?? 0) + 1 : 0

  let uploaded = 0
  let failed = 0
  const failedNames: string[] = []

  for (const file of files) {
    // Per-file validation — one bad file must not abort the whole batch.
    if (!ALLOWED_TYPES.includes(file.type)) {
      failed++
      failedNames.push(`${file.name}（格式不支援）`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      failed++
      failedNames.push(`${file.name}（超過 8 MB）`)
      continue
    }

    const path = buildCaseImageStoragePath(caseId, file.name)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined })

    if (uploadError) {
      failed++
      failedNames.push(`${file.name}（上傳失敗）`)
      continue
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const { error: insertError } = await supabase.from("case_images").insert({
      case_id: caseId,
      storage_path: path,
      public_url: urlData.publicUrl,
      alt_text: null,
      sort_order: nextSortOrder,
    })

    if (insertError) {
      // DB insert failed after Storage upload succeeded → remove the orphan.
      await supabase.storage.from(BUCKET).remove([path])
      failed++
      failedNames.push(`${file.name}（資料寫入失敗）`)
      continue
    }

    uploaded++
    nextSortOrder++
  }

  revalidateEdit(caseId)

  if (uploaded > 0 && failed === 0) {
    return { ok: true, uploaded, failed }
  }
  if (uploaded > 0 && failed > 0) {
    return {
      ok: false,
      uploaded,
      failed,
      error: `已成功上傳 ${uploaded} 張，另有 ${failed} 張失敗：${failedNames.join("、")}`,
    }
  }
  return {
    ok: false,
    uploaded,
    failed,
    error: `圖片上傳失敗：${failedNames.join("、")}`,
  }
}

/** Update a single image's ALT text (scoped to its parent case). */
export async function updateImageAlt(
  caseId: string,
  imageId: string,
  altText: string,
): Promise<ImageActionResult> {
  await requireAdmin()
  if (!caseId?.trim() || !imageId?.trim()) {
    return { ok: false, error: "參數無效。" }
  }

  const supabase = await createClient()
  const clean = typeof altText === "string" ? altText.trim() : ""

  const { error } = await supabase
    .from("case_images")
    .update({ alt_text: clean === "" ? null : clean })
    .eq("id", imageId)
    .eq("case_id", caseId) // ownership guard: never touch another case's image

  if (error) {
    return { ok: false, error: `ALT 文字儲存失敗：${error.message}` }
  }

  revalidateEdit(caseId)
  return { ok: true }
}

/**
 * Persist a new image ordering. Only images belonging to the given case are
 * updated; the submitted set is validated against the live set first.
 */
export async function reorderCaseImages(
  caseId: string,
  orderedIds: string[],
): Promise<ImageActionResult> {
  await requireAdmin()
  if (!caseId?.trim()) return { ok: false, error: "案例識別碼無效。" }

  const cleanIds = Array.isArray(orderedIds)
    ? orderedIds.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : []
  if (cleanIds.length === 0) return { ok: false, error: "沒有可排序的圖片。" }

  const supabase = await createClient()

  // Validate the submitted ids match the live set for THIS case exactly.
  const { data: current, error: fetchError } = await supabase
    .from("case_images")
    .select("id")
    .eq("case_id", caseId)
  if (fetchError) {
    return { ok: false, error: `無法確認圖片資料：${fetchError.message}` }
  }
  const liveIds = new Set((current ?? []).map((r) => r.id))
  if (cleanIds.length !== liveIds.size || !cleanIds.every((id) => liveIds.has(id))) {
    return { ok: false, error: "圖片清單已變更，請重新整理後再排序。" }
  }

  // Sequential 0,1,2… ordering; only writes sort_order, scoped by case_id.
  let failures = 0
  for (let i = 0; i < cleanIds.length; i++) {
    const { error } = await supabase
      .from("case_images")
      .update({ sort_order: i })
      .eq("id", cleanIds[i])
      .eq("case_id", caseId)
    if (error) failures++
  }

  revalidateEdit(caseId)
  if (failures > 0) {
    return { ok: false, error: `排序未完全儲存，有 ${failures} 張圖片更新失敗，請重試。` }
  }
  return { ok: true }
}

/**
 * Delete a single image: verify ownership, remove ONLY its exact Storage
 * object by storage_path, then delete its row. Reports inconsistencies.
 */
export async function deleteCaseImage(
  caseId: string,
  imageId: string,
): Promise<ImageActionResult> {
  await requireAdmin()
  if (!caseId?.trim() || !imageId?.trim()) {
    return { ok: false, error: "參數無效。" }
  }

  const supabase = await createClient()

  // 1–2. Identify the exact record AND verify it belongs to this case.
  const { data: image, error: fetchError } = await supabase
    .from("case_images")
    .select("id, case_id, storage_path")
    .eq("id", imageId)
    .eq("case_id", caseId)
    .single()

  if (fetchError || !image) {
    return { ok: false, error: "找不到要刪除的圖片，或該圖片不屬於此案例。" }
  }

  // 3. Remove ONLY this exact storage object (never an unscoped filename).
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path])

  if (storageError) {
    // Do not pretend success; keep the DB row so cleanup can be retried.
    return {
      ok: false,
      error: `圖片檔案刪除失敗，已保留資料以便重試：${storageError.message}`,
    }
  }

  // 4. Delete the DB row.
  const { error: deleteError } = await supabase
    .from("case_images")
    .delete()
    .eq("id", imageId)
    .eq("case_id", caseId)

  if (deleteError) {
    // Storage object already gone but row remains — report the inconsistency.
    return {
      ok: false,
      error: `圖片檔案已刪除，但資料列刪除失敗（資料不一致），請重新整理後再試：${deleteError.message}`,
    }
  }

  revalidateEdit(caseId)
  return { ok: true }
}
