// Shared, framework-agnostic constants + pure helpers for case gallery images.
// Kept OUT of any "use server" module so they can be exported as plain
// (non-async) values and reused by both the edit-page image actions and the
// create-page flow without duplicating the bucket / limits / path strategy.

export const CASE_IMAGE_BUCKET = "case-images"
export const CASE_IMAGE_MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB — matches the bucket limit
export const CASE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]

/** Build a collision-resistant storage path under a case's own gallery folder. */
export function buildCaseImageStoragePath(caseId: string, originalName: string): string {
  const rawExt = (originalName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const ext = rawExt || "bin"
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `case-items/${caseId}/${unique}.${ext}`
}

export type GalleryFileValidationResult = { ok: true } | { ok: false; error: string }

/**
 * Server-side validation for a batch of gallery files. Never trusts the
 * browser: re-checks MIME type and size for every file. An empty batch is
 * allowed (gallery is optional). Used by the create flow before any case row
 * exists, and safe to reuse elsewhere.
 */
export function validateGalleryFiles(files: File[]): GalleryFileValidationResult {
  for (const file of files) {
    if (!CASE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: `圖片「${file.name}」格式不支援，請改用 JPG / PNG / WebP / GIF / AVIF。`,
      }
    }
    if (file.size > CASE_IMAGE_MAX_FILE_SIZE) {
      return { ok: false, error: `圖片「${file.name}」超過 8 MB 上限，請壓縮後再上傳。` }
    }
  }
  return { ok: true }
}
