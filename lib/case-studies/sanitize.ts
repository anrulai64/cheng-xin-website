import "server-only"
import sanitizeHtml from "sanitize-html"

/**
 * Server-side HTML sanitization for CMS case-study content
 * (`description_html`, `detail_html`) produced by the admin Tiptap editor.
 *
 * This runs ONLY on the server (marked `server-only`) using the maintained
 * `sanitize-html` library — never a browser-only sanitizer, never regex.
 * Output is safe to pass to `dangerouslySetInnerHTML`.
 *
 * Policy: allow the exact tag/attribute set Tiptap emits; strip everything
 * else (scripts, event handlers, javascript: URLs, embedded/dangerous
 * content). `head_code` is never processed here.
 */

const ALLOWED_TAGS = [
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
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  // Tiptap sometimes wraps table content in a colgroup/col; harmless structural tags.
  "colgroup",
  "col",
  "span",
]

/**
 * Derives a safe plain-text excerpt from CMS HTML for use in metadata
 * descriptions. Strips ALL tags (allowedTags: []), collapses whitespace, and
 * truncates. Server-only; never used for rendering.
 */
export function htmlToPlainExcerpt(
  dirty: string | null | undefined,
  maxLength = 160,
): string {
  if (!dirty || typeof dirty !== "string") return ""
  const text = sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}

export function sanitizeCaseHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return ""

  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      // Tiptap table cells can carry span/style structural attributes.
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      col: ["span"],
      colgroup: ["span"],
      // Text-align from the editor is applied via style on block elements.
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      span: ["style"],
    },
    // Only allow text-align in style attributes; drop everything else.
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    // Only safe URL schemes; this strips javascript: and data: (except images).
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      // Allow inline data: images (Tiptap can embed them) plus remote URLs.
      img: ["http", "https", "data"],
    },
    allowProtocolRelative: false,
    // Force safe rel on links that open in a new tab; keep author-provided rel too.
    transformTags: {
      a: (tagName, attribs) => {
        const out: sanitizeHtml.IFrame["attribs"] = { ...attribs }
        if (out.target === "_blank") {
          const rel = new Set((out.rel ?? "").split(/\s+/).filter(Boolean))
          rel.add("noopener")
          rel.add("noreferrer")
          out.rel = Array.from(rel).join(" ")
        }
        return { tagName, attribs: out }
      },
    },
    // Disallow comments (can hide conditional/IE payloads).
    allowedIframeHostnames: [],
    parser: {
      lowerCaseAttributeNames: true,
    },
  })
}
