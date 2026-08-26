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
 * Policy (STEP A10-B): this allowlist is intentionally still NARROWER than
 * Case CMS's. The Article RichText toolbar (see
 * app/admin/(protected)/articles/rich-text-editor.tsx) now covers the
 * A10-B "core editor foundation" feature set: paragraph, H2/H3,
 * bold/italic, UNDERLINE, STRIKETHROUGH, bullet/ordered list, blockquote,
 * HORIZONTAL RULE, TEXT ALIGN (left/center/right), LINKS (insert/edit/
 * remove) and a Source/HTML mode. Only tags/attributes reachable from that
 * toolbar (or hand-writable in Source mode within this same allowlist) are
 * permitted; everything else is stripped.
 *
 * A10-B deliberately does NOT yet allow: img, iframe/YouTube, table (and
 * its th/td/thead/tbody/colgroup/col), span, or any typography style
 * (font-size, font-family, color, background-color). Those belong to the
 * later A10-C/A10-D/A10-E/A10-F STEPS and MUST NOT be pre-enabled here.
 *
 * Do NOT broaden this allowlist without updating both the Admin editor
 * toolbar and this comment in the same change.
 */

// Block/inline tags the A10-B toolbar can produce. Added in A10-B:
//   - `u`  : Underline mark (StarterKit v3 bundles @tiptap/extension-underline)
//   - `s`  : Strikethrough mark (StarterKit Strike)
//   - `hr` : Horizontal rule (StarterKit HorizontalRule)
//   - `a`  : Link mark (StarterKit v3 bundles @tiptap/extension-link)
// `br` is included because Tiptap's hard-break (Shift+Enter) serializes to
// <br>. Text alignment does NOT add a tag — it adds a `text-align` inline
// style on the existing block tags (p/h2/h3), handled via allowedStyles
// below. Still no `h1` (the Article title owns the page H1).
export const ARTICLE_ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "br",
]

// Only links carry attributes in A10-B. `href` is validated against the
// scheme allowlist below; `target`/`rel` are permitted so the editor's
// external-link behavior (target="_blank") and the transformTags-enforced
// safe `rel` can survive. No tag is allowed `style` here directly — the
// text-align style is permitted separately via `allowedStyles` (which
// sanitize-html applies independently of `allowedAttributes`).
export const ARTICLE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
}

/**
 * Sanitizes Article `content_html` against the A10-B RichText toolbar
 * allowlist. Returns `""` for null/undefined/non-string input. Unexpected
 * sanitizer errors are allowed to throw so callers can decide how to fail
 * (Admin: abort the save; Public: treat as empty) — raw HTML is never used
 * as a fallback in either caller.
 *
 * LINK rel/target policy (STEP A10-B §9/§10): unlike Case CMS — which
 * globally forces `target="_blank"` AND `rel="...nofollow"` on every link —
 * Articles must keep INTERNAL links normally crawlable. So:
 *   - Internal root-relative links (href starting with "/"): no forced
 *     target, no forced rel, and any stray nofollow the editor might have
 *     added is removed so internal SEO link equity is preserved.
 *   - External links opened in a new tab (target="_blank"): forced
 *     rel="noopener noreferrer" (security), but NOT nofollow — editorial
 *     external links stay follow by default.
 * `javascript:`, `data:`, `vbscript:` and other unsafe schemes are stripped
 * by allowedSchemes below regardless of the transform.
 */
export function sanitizeArticleContentHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return ""

  return sanitizeHtml(dirty, {
    allowedTags: ARTICLE_ALLOWED_TAGS,
    allowedAttributes: ARTICLE_ALLOWED_ATTRIBUTES,
    // Safe link schemes only. This strips javascript:/data:/vbscript: from
    // href. Root-relative internal links ("/blog/...") are not schemes and
    // are always permitted by sanitize-html.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {},
    allowProtocolRelative: false,
    // ONLY the text-align property (from the TextAlign extension), and only
    // the three approved values, on the block tags Tiptap emits it on.
    // No other CSS property can survive — this is NOT an open style channel
    // and MUST NOT be broadened for typography until the relevant A10 STEP.
    allowedStyles: {
      p: { "text-align": [/^(left|center|right)$/] },
      h2: { "text-align": [/^(left|center|right)$/] },
      h3: { "text-align": [/^(left|center|right)$/] },
    },
    // Article-specific safe link handling (see policy doc above).
    transformTags: {
      a: (tagName, attribs) => {
        const out: sanitizeHtml.IFrame["attribs"] = { ...attribs }
        const href = (out.href ?? "").trim()
        const isInternal = href.startsWith("/")

        if (isInternal) {
          // Internal links stay plain + crawlable: no new tab, no nofollow.
          delete out.target
          delete out.rel
        } else if (out.target === "_blank") {
          // External new-tab links: enforce security rel, but never nofollow.
          const rel = new Set((out.rel ?? "").split(/\s+/).filter(Boolean))
          rel.delete("nofollow")
          rel.add("noopener")
          rel.add("noreferrer")
          out.rel = Array.from(rel).join(" ")
        } else if (out.rel) {
          // Non-new-tab external link that arrived with a rel: strip any
          // stray nofollow the editor may have added, keep nothing else
          // meaningful (there is no security need without target=_blank).
          const rel = new Set(out.rel.split(/\s+/).filter(Boolean))
          rel.delete("nofollow")
          if (rel.size > 0) out.rel = Array.from(rel).join(" ")
          else delete out.rel
        }
        return { tagName, attribs: out }
      },
    },
    // No iframe support in A10-B.
    allowedIframeHostnames: [],
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
