import "server-only"

/**
 * STEP A6-A public visibility contract for CMS Articles.
 *
 * Public visibility is controlled ONLY by:
 *   - status ('published' required; 'draft'/'offline'/unknown are hidden)
 *   - start_date (inclusive lower bound, DATE column, NULL = no lower bound)
 *   - end_date   (inclusive upper bound, DATE column, NULL = no upper bound)
 *
 * `publish_date` is editorial metadata ONLY (the date an Article displays as
 * "published") and MUST NEVER participate in this check — this is a locked
 * product decision already established by Article Admin and
 * scripts/013_article_cms_v1_security.sql.
 */

/**
 * "Today" as a calendar date in Asia/Taipei (this business is Taiwan-facing),
 * formatted as YYYY-MM-DD so it compares correctly (as a string) against the
 * DATE columns `start_date`/`end_date`. Deliberately NOT the Vercel server's
 * UTC clock and NOT browser/client time — both would drift from the
 * Taiwan-calendar-day boundary this business actually schedules against.
 * Uses only the built-in Intl API; no date library is installed for this.
 */
export function getTaipeiTodayDateString(now: Date = new Date()): string {
  // "en-CA" is the one common Intl locale that formats as YYYY-MM-DD, which
  // matches Postgres DATE's ISO text representation exactly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export type ArticleVisibilityFields = {
  status: string
  start_date: string | null
  end_date: string | null
}

/**
 * Final, independent visibility check for a CMS Article. Re-verified
 * server-side regardless of how/whether the row was already filtered at the
 * query level (defense in depth — see STEP A6-A §9/§16). Boundary dates are
 * inclusive on both ends: `today === start_date` and `today === end_date`
 * are both visible.
 */
export function isArticlePubliclyVisible(
  article: ArticleVisibilityFields,
  today: string = getTaipeiTodayDateString(),
): boolean {
  if (article.status !== "published") return false
  if (article.start_date !== null && article.start_date > today) return false
  if (article.end_date !== null && article.end_date < today) return false
  return true
}
