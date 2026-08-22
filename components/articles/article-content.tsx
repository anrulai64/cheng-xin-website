import { isEmptyArticleHtml, sanitizeArticleContentHtml } from "@/lib/articles/sanitize"
import { cn } from "@/lib/utils"

/**
 * Server component that renders sanitized Article `content_html` for public
 * pages. This is a reusable rendering-contract foundation — it is not yet
 * wired to any live route (see app/blog/[slug]/page.tsx, which remains on
 * static data for this STEP).
 *
 * Defense-in-depth: even though `articles.content_html` should already be
 * sanitized on Admin Create/Edit (see lib/articles/sanitize.ts, used by
 * app/admin/(protected)/articles/actions.ts), this component re-sanitizes
 * with the SAME allowlist before rendering. Database HTML is never trusted
 * unconditionally — this guards against legacy/out-of-band writes and any
 * future drift between the save path and this render path.
 *
 * `dangerouslySetInnerHTML` is used ONLY here, and ONLY on the output of
 * sanitizeArticleContentHtml() — never on the raw `html` prop.
 *
 * Null/empty/sanitized-empty input renders nothing (no wrapper element),
 * so callers never need to guard against an empty content block.
 */
export function ArticleContent({
  html,
  className,
}: {
  html: string | null | undefined
  className?: string
}) {
  if (typeof html !== "string" || isEmptyArticleHtml(html)) return null

  // Fail closed: an unexpected sanitizer error must never surface raw HTML
  // or crash the public page — treat it as if there were no content.
  let clean = ""
  try {
    clean = sanitizeArticleContentHtml(html)
  } catch {
    return null
  }
  // Sanitization can itself produce an empty-shape result (e.g. disallowed-
  // only input like "<script>...</script>" -> "", or a stripped H1 leaving
  // no wrapping tag) — treat that the same as no content.
  if (isEmptyArticleHtml(clean)) return null

  return <div className={cn("article-content", className)} dangerouslySetInnerHTML={{ __html: clean }} />
}
