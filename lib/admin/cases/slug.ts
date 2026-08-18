/**
 * Slug helpers shared by the Case Study CMS admin UI (client + server).
 *
 * A valid slug is URL-safe: lowercase ASCII letters/digits separated by single
 * hyphens, no leading/trailing hyphen. Chinese-only names cannot be reliably
 * transliterated, so `slugify` returns "" in that case and the caller must let
 * the administrator supply a slug manually (or store null).
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

/**
 * Best-effort conversion of a name into a URL-safe slug. Returns "" when the
 * input contains no usable ASCII alphanumerics (e.g. pure Chinese text).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}
