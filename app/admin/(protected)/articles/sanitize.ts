import "server-only"
import sanitizeHtml from "sanitize-html"

/**
 * Server-side HTML sanitization for Article `content_html`, produced by the
 * Article Admin Tiptap editor (see ./rich-text-editor.tsx).
 *
 * This runs ONLY on the server (marked `server-only`) using the same
 * maintained `sanitize-html` library already used by Case CMS
 * (lib/case-studies/sanitize.ts) — never a browser-only sanitizer, never
 * regex-based security filtering.
 *
 * TRUST BOUNDARY:
 *   - Browser/Admin editor output (`content_html` in FormData): UNTRUSTED
 *     HTML input. It must never be persisted or treated as safe just
 *     because the request came from an authenticated Admin session.
 *   - Output of this function: SANITIZED CMS HTML, suitable for later
 *     controlled rendering (not yet wired to Public Blog).
 *
 * Policy: this allowlist is intentionally NARROWER than Case CMS's, because
 * the Article RichText toolbar (see ./rich-text-editor.tsx) is locked to a
 * smaller feature set — no links, no images, no tables, no custom styles.
 * Only tags reachable from that toolbar are allowed; everything else
 * (scripts, styles, event handlers, iframes, links, images, tables, H1,
 * arbitrary attributes) is stripped.
 */

// Exactly the block/inline tags StarterKit's locked toolbar can produce:
// paragraph, heading (levels 2-3 only), bold, italic, bullet list,
// ordered list, list item, blockquote. `br` is included because Tiptap's
// hard-break behavior (Shift+Enter within a paragraph) serializes to <br>,
// which is required to preserve that line-break content correctly.
const ARTICLE_ALLOWED_TAGS = ["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "blockquote", "br"]

// No tag in ARTICLE_ALLOWED_TAGS needs an attribute for the current locked
// toolbar (no href/src, no style/class/id, no data-*/aria-*, no event
// handlers). Omitting attributes entirely means none can survive.
const ARTICLE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {}

/**
 * Sanitizes Article `content_html` against the locked RichText toolbar
 * allowlist. Returns `""` for null/undefined/non-string input. Unexpected
 * sanitizer errors are allowed to throw so the caller can abort the save;
 * raw HTML is never used as a fallback.
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
      // Disallow HTML comments (can hide conditional/legacy payloads).
    parser: {
      lowerCaseAttributeNames: true,
    },
  })
}
