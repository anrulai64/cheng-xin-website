import { sanitizeCaseHtml } from "@/lib/case-studies/sanitize"
import { cn } from "@/lib/utils"

/**
 * Server component that sanitizes CMS HTML and renders it inside a scoped
 * content wrapper. The `case-content` class scopes typography styles to this
 * block so admin editor chrome/styles are never exposed publicly.
 *
 * `dangerouslySetInnerHTML` is used ONLY on already-sanitized markup.
 */
export function SafeHtml({
  html,
  className,
}: {
  html: string | null | undefined
  className?: string
}) {
  const clean = sanitizeCaseHtml(html)
  if (!clean) return null

  return (
    <div
      className={cn("case-content", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
