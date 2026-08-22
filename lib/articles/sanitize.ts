import "server-only"
import sanitizeHtml from "sanitize-html"

/**
 * Shared server-side HTML sanitization contract for Article `content_html`.
 *
 * This is the SINGLE source of truth for the Article allowlist, used by
 * BOTH:
 *   - the Admin save path (app/admin/(protected)/articles/actions.ts), which
 *     sanitizes untrusted Tiptap editor output before persistence, and
 *   - the future public rendering path (components/articles/article-content.tsx),
 *     which re-sanitizes DB content_html defense-in-depth before rendering.
 *
 * Runs ONLY on the server (marked `server-only`) using the same maintained
 * `sanitize-html` library already used by Case CMS (lib/case-studies/sanitize.ts)
 * — never a browser-only sanitizer, never regex-based security filtering.
 *
 * TRUST BOUNDARY:
 *   - Browser/Admin editor output (`content_html` in FormData): UNTRUSTED
 *     HTML input. Never persisted or treated as safe just because the
 *     request came from an authenticated Admin session.
 *   - Database `articles.content_html` after Create/Edit: sanitized HTML or
 *     NULL — but still re-sanitized before any public render, as defense in
 *     depth against legacy/out-of-band writes or future drift.
 *   - Output of this function: SANITIZED CMS HTML, safe to pass to
 *     `dangerouslySetInnerHTML` in the narrowly-scoped Article public
 *     rendering component only.
 *
 * Policy: this allowlist is intentionally NARROWER than Case CMS's, because
 * the Article RichText toolbar (see
 * app/admin/(protected)/articles/rich-text-editor.tsx) is locked to a
 * smaller feature set — no links, no images, no tables, no custom styles.
 * Only tags reachable from that toolbar are allowed; everything else
 * (scripts, styles, event handlers, iframes, links, images, tables, H1,
 * arbitrary attributes) is stripped.
 *
 * Do NOT broaden this allowlist without updating both the Admin editor
 * toolbar and this comment in the same change.
 */

// Exactly the block/inline tags StarterKit's locked toolbar can produce:
// paragraph, heading (levels 2-3 only), bold, italic, bullet list,
// ordered list, list item, blockquote. `br` is included because Tiptap's
// hard-break behavior (Shift+Enter within a paragraph) serializes to <br>,
// which is required to preserve that line-break content correctly.
export const ARTICLE_ALLOWED_TAGS = ["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "blockquote", "br"]

// No tag in ARTICLE_ALLOWED_TAGS needs an attribute for the current locked
// toolbar (no href/src, no style/class/id, no data-*/aria-*, no event
// handlers). Omitting attributes entirely means none can survive.
export const ARTICLE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {}

/**
 * Sanitizes Article `content_html` against the locked RichText toolbar
 * allowlist. Returns `""` for null/undefined/non-string input. Unexpected
 * sanitizer errors are allowed to throw so callers can decide how to fail
 * (Admin: abort the save; Public: treat as empty) — raw HTML is never used
 * as a fallback in either caller.
 */
export function sanitizeArticleContentHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return ""

  return sanitizeHtml(dirty, {
    allowedTags: ARTICLE_ALLOWED_TAGS,
    allowedAttributes: ARTICLE_ALLOWED_ATTRIBUTES,
    // No URL-bearing tags/attributes are allowed above, so no scheme
    // should ever need to pass through. Disallow all schemes explicitly
    // rather than relying on library defaults.
    allowedSchemes: [],
    allowedSchemesByTag: {},
    allowProtocolRelative: false,
    // No style attribute is allowed above; this is redundant defense
    // against arbitrary CSS surviving via some other path.
    allowedStyles: {},
    parser: {
      lowerCaseAttributeNames: true,
    },
  })
}

// Detects Tiptap's "editor is empty" HTML representations (e.g. "",
// "<p></p>", "<p><br></p>", or whitespace variants/repetitions of these) so
// genuinely empty content can be treated as absent instead of meaningless
// empty markup. Shared by:
//   - the Admin save path, to normalize content_html to NULL before
//     persistence (see app/admin/(protected)/articles/actions.ts), and
//   - the public render path, to avoid rendering an empty `.article-content`
//     wrapper around e.g. a bare "<p></p>" (see components/articles/article-content.tsx).
// This is a cheap shape-check only — it is NOT the security boundary. The
// security boundary is sanitizeArticleContentHtml() above.
const EMPTY_CONTENT_HTML_PATTERN = /^(?:<p>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)*$/i

export function isEmptyArticleHtml(html: string): boolean {
  const trimmed = html.trim()
  return trimmed === "" || EMPTY_CONTENT_HTML_PATTERN.test(trimmed)
}
