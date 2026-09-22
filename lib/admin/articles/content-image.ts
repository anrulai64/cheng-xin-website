// Shared, framework-agnostic constants + pure helpers for Article INLINE
// CONTENT images (STEP A10-F). Deliberately kept OUT of any "use server"
// module — mirrors the split already used by lib/admin/articles/cover-image.ts
// and lib/admin/cases/images.ts — so these can be plain (non-async) exports
// reused by both the Server Action and (for UX pre-checks) the client editor,
// without duplicating the bucket / limits / MIME→extension / path strategy.
//
// Reuses the SAME `article-images` bucket as the cover image (no new
// Storage bucket), but writes to a completely separate namespace:
//
//   articles/{articleId}/content/{filename}
//
// vs. the cover's:
//
//   articles/{articleId}/cover-{filename}
//
// so the two features can never collide or be confused with one another.
export { ARTICLE_IMAGE_BUCKET } from "./cover-image"

/** 8 MB — same limit as the cover image / bucket policy. */
export const ARTICLE_CONTENT_IMAGE_MAX_FILE_SIZE = 8 * 1024 * 1024

/**
 * Allowed MIME types. SVG (image/svg+xml) is deliberately EXCLUDED: it can
 * carry active/script content and there is no SVG sanitizer in this
 * project — same policy as the cover image.
 */
export const ARTICLE_CONTENT_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

/**
 * MIME → file extension mapping. The stored object's extension is derived
 * SOLELY from the validated MIME type — the client's original filename is
 * never trusted for identity, so a ".svg"/".exe"/".html" disguise can never
 * reach Storage.
 */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export type ContentImageValidationResult = { ok: true; ext: string } | { ok: false; error: string }

/**
 * Server-side authoritative validation for a single inline content-image
 * file. Never trusts the browser `<input accept>`. Re-checks size (reject
 * 0-byte and > limit) and MIME (must be in the allowlist), and returns the
 * trusted extension derived from the MIME type.
 */
export function validateContentImageFile(file: File): ContentImageValidationResult {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "請選擇有效的圖片檔案。" }
  }
  if (file.size > ARTICLE_CONTENT_IMAGE_MAX_FILE_SIZE) {
    return { ok: false, error: "圖片超過 8 MB 上限，請壓縮後再上傳。" }
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return { ok: false, error: "圖片格式不支援，請改用 JPG / PNG / WebP / GIF 或 AVIF。" }
  }
  return { ok: true, ext }
}

/**
 * Build the trusted, bucket-relative content-image object path:
 *
 *   articles/{articleId}/content/{timestamp}-{uuid}.{ext}
 *
 * - bucket-relative: does NOT include the bucket name, Supabase origin, or
 *   the /storage/v1/object/public/ prefix.
 * - Article-ID namespaced under a dedicated `content/` folder: keeps this
 *   completely separate from the cover image's `cover-*` object and is
 *   exactly the namespace the sanitizer's trusted-path check expects
 *   (see lib/articles/sanitize.ts).
 * - collision-resistant: timestamp + crypto.randomUUID().
 * - ext is the MIME-derived trusted extension (never the client filename).
 */
export function buildArticleContentImageStoragePath(articleId: string, ext: string): string {
  const unique = `${Date.now()}-${crypto.randomUUID()}`
  return `articles/${articleId}/content/${unique}.${ext}`
}
