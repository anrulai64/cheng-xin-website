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

/**
 * Matches a slug that is ENTIRELY numeric (one or more ASCII digits, nothing
 * else). Used to decide which existing slugs participate in the sequential
 * numeric auto-slug sequence. Manual slugs like "taoyuan-home" are ignored;
 * "01", "09", "25", "125" all qualify.
 */
export const NUMERIC_SLUG_PATTERN = /^\d+$/

export function isNumericSlug(slug: string | null | undefined): boolean {
  return typeof slug === "string" && NUMERIC_SLUG_PATTERN.test(slug)
}

/**
 * Format a positive integer as a zero-padded numeric slug with a MINIMUM width
 * of 2 digits and NO maximum:
 *   1  -> "01"   9  -> "09"   10 -> "10"   99 -> "99"   100 -> "100"
 */
export function formatNumericSlug(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * Given the full list of existing slugs (any mix of manual + numeric + null),
 * return the NEXT sequential numeric slug string.
 *
 * Algorithm (highest + 1, NOT gap-filling):
 *   - keep only entirely-numeric slugs
 *   - parse each as a base-10 integer
 *   - take the maximum; if none exist, the max is treated as 0
 *   - the next value is max + 1
 *   - format with `formatNumericSlug`
 *
 * So an empty set yields "01"; {01,02} yields "03"; {01,02,09} yields "10";
 * {01,02,25} yields "26"; {01,02,03,05} yields "06" (gap 04 is NOT reused).
 */
export function nextNumericSlug(existingSlugs: (string | null | undefined)[]): string {
  let max = 0
  for (const s of existingSlugs) {
    if (isNumericSlug(s)) {
      const n = Number.parseInt(s as string, 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return formatNumericSlug(max + 1)
}
