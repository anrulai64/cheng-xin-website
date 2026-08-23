// Shared, framework-agnostic constants + pure helpers for the Article COVER
// image (STEP A7-B2). Deliberately kept OUT of any "use server" module so it
// can export plain (non-async) values reused by both the server actions and
// (for UX pre-checks) the client CoverImageField, without duplicating the
// bucket / limits / MIME→extension / path strategy.
//
// This mirrors the proven Case CMS split (lib/admin/cases/images.ts) but is a
// SEPARATE Article-scoped module — no shared image framework is abstracted,
// and the Case bucket/paths are never touched.

/** Public bucket created in scripts/003_articles_storage.sql. */
export const ARTICLE_IMAGE_BUCKET = "article-images"

/** 8 MB — matches the article-images bucket file_size_limit (8388608). */
export const ARTICLE_COVER_MAX_FILE_SIZE = 8 * 1024 * 1024

/**
 * Allowed MIME types — matches the bucket allowlist. SVG (image/svg+xml) is
 * deliberately EXCLUDED: it can carry active/script content and there is no
 * SVG sanitizer in this project (A7-B2 §9).
 */
export const ARTICLE_COVER_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

/**
 * MIME → file extension mapping. The stored object's extension is derived
 * SOLELY from the validated MIME type — the client's original filename is
 * never trusted for identity (A7-B2 §10), so a ".svg"/".exe"/".html" disguise
 * can never reach Storage.
 */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export type CoverFileValidationResult =
  | { ok: true; ext: string }
  | { ok: false; error: string }

/**
 * Server-side authoritative validation for a single cover file. Never trusts
 * the browser <input accept>. Re-checks size (reject 0-byte and > limit) and
 * MIME (must be in the allowlist), and returns the trusted extension derived
 * from the MIME type. All error messages are friendly Chinese and expose no
 * bucket/policy internals.
 */
export function validateCoverFile(file: File): CoverFileValidationResult {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "請選擇有效的圖片檔案。" }
  }
  if (file.size > ARTICLE_COVER_MAX_FILE_SIZE) {
    return { ok: false, error: "圖片超過 8 MB 上限，請壓縮後再上傳。" }
  }
  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return { ok: false, error: "圖片格式不支援，請改用 JPG / PNG / WebP / GIF / AVIF。" }
  }
  return { ok: true, ext }
}

/**
 * Build the trusted, bucket-relative cover object path:
 *
 *   articles/{articleId}/cover-{timestamp}-{uuid}.{ext}
 *
 * - bucket-relative: does NOT include the bucket name, Supabase origin, or
 *   the /storage/v1/object/public/ prefix (A7-B1 contract) — exactly what
 *   storage.from(bucket).remove([...]) accepts.
 * - Article-ID namespaced: enables precise ownership checks + cleanup and
 *   guarantees it can never collide with another Article or the case-images
 *   bucket.
 * - collision-resistant: timestamp + crypto.randomUUID().
 * - ext is the MIME-derived trusted extension (never the client filename).
 */
export function buildArticleCoverStoragePath(articleId: string, ext: string): string {
  const unique = `${Date.now()}-${crypto.randomUUID()}`
  return `articles/${articleId}/cover-${unique}.${ext}`
}

/**
 * Application-layer ownership guard for a stored cover path. Even though the
 * Storage policies have no folder restriction, we NEVER delete a Storage
 * object whose path does not live under this Article's own namespace
 * (A7-B2 §14) — this prevents deleting another Article's cover, a Case image,
 * or anything in another bucket, even if the DB value were somehow wrong.
 */
export function isOwnedArticleCoverPath(path: string | null | undefined, articleId: string): boolean {
  if (typeof path !== "string" || path.trim() === "") return false
  return path.startsWith(`articles/${articleId}/`)
}
