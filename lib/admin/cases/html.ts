/**
 * Shared HTML helpers for the case content editor. Used by BOTH the client
 * form and the server actions so the "visually empty" rule is identical on
 * both sides.
 */

// Tags that carry meaningful content even when they contain no text.
const NON_TEXT_CONTENT_TAGS = /<(img|table|iframe|video|audio|figure|hr|source|picture|svg)\b/i

/**
 * Returns true when an HTML string has no meaningful content — i.e. it is
 * empty or contains only empty wrappers / whitespace / line breaks such as:
 *   "", "<p></p>", "<br>", "<p><br></p>", "<p>&nbsp;</p>", "  \n  "
 *
 * Media/structural tags (img, table, hr, iframe, ...) always count as content.
 */
export function isHtmlContentEmpty(html: string | null | undefined): boolean {
  if (!html) return true

  // Anything with real media/structure is never "empty".
  if (NON_TEXT_CONTENT_TAGS.test(html)) return false

  const text = html
    // Treat line breaks as (collapsible) whitespace, not content.
    .replace(/<br\s*\/?>/gi, " ")
    // Drop all remaining tags.
    .replace(/<[^>]*>/g, "")
    // Decode the handful of whitespace-ish entities that show up in "empty" HTML.
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;|&#xa0;/gi, " ")
    .replace(/&zwnj;|&#8204;/gi, "")
    .replace(/\u00a0/g, " ")
    // Collapse whitespace.
    .replace(/\s+/g, " ")
    .trim()

  return text.length === 0
}
