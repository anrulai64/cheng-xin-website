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
 * Policy (STEP A10-C): this allowlist is intentionally still NARROWER than
 * Case CMS's. The Article RichText toolbar (see
 * app/admin/(protected)/articles/rich-text-editor.tsx) now covers the
 * A10-B core set (paragraph, H2/H3, bold/italic, UNDERLINE, STRIKETHROUGH,
 * bullet/ordered list, blockquote, HORIZONTAL RULE, TEXT ALIGN, LINKS,
 * Source/HTML mode) PLUS the A10-C "controlled typography" set:
 *   - FONT SIZE  → <span style="font-size: …rem"> (fixed rem allowlist)
 *   - FONT FAMILY → <span style="font-family: …">  (fixed keyword allowlist)
 *   - TEXT COLOR → <span style="color: #rrggbb">   (fixed palette allowlist)
 *   - HIGHLIGHT  → <mark style="background-color: #rrggbb"> (fixed palette)
 * Only tags/attributes reachable from that toolbar (or hand-writable in
 * Source mode within this same allowlist) are permitted; everything else is
 * stripped.
 *
 * CRITICAL: typography is a CLOSED palette, NOT an open style channel. The
 * `span`/`mark` `style` attribute is permitted only so `allowedStyles` can
 * then narrow it to the EXACT approved property/value pairs below. Any other
 * property (position, display, width, background-image, url(), font-size
 * outside the rem set, arbitrary colors, etc.) is stripped. The palette
 * values here MUST stay byte-identical to the editor's dropdown constants
 * (FONT_SIZES / FONT_FAMILIES / TEXT_COLORS / HIGHLIGHTS in
 * rich-text-editor.tsx) or valid editor output would be silently dropped on
 * save — update BOTH files together.
 *
 * A10-C deliberately still does NOT allow: img, iframe/YouTube. Those belong
 * to later A10 STEPS and MUST NOT be pre-enabled here.
 *
 * A10-D adds Table V1: table/tbody/tr/th/td ONLY — no thead, no tfoot, no
 * colgroup/col (the editor's Table extension runs with resizable: false, so
 * it never emits column-width markup), and no attributes on any table tag
 * (no colspan/rowspan/scope/style/class/data-*). Merge Cells, Split Cell,
 * and column/row resizing are all deliberately out of scope for V1 and are
 * NOT reachable from the toolbar (see rich-text-editor.tsx) — this is a
 * strict minimum-surface policy, not an oversight. Widening it (e.g. to
 * allow colspan/rowspan) requires enabling the corresponding editor command
 * AND updating this allowlist together, exactly like every other toolbar
 * feature in this file.
 *
 * A10-E adds YouTube Embed V1: a SINGLE canonical `iframe.youtube-embed`
 * shape, not a generic iframe allowance. See `transformTags.iframe` below —
 * every surviving iframe's attributes are REBUILT FROM SCRATCH from a
 * freshly-validated YouTube video ID; nothing from the incoming iframe
 * (attributes, class, or otherwise) is trusted or copied through. Any
 * iframe that does not resolve to a valid `youtube-nocookie.com/embed/`
 * video ID — including non-YouTube hosts, `javascript:`/`data:`/`srcdoc`
 * payloads, and malformed video IDs — is dropped entirely by
 * `exclusiveFilter` below, never passed through with partial/blanked
 * attributes.
 *
 * Do NOT broaden this allowlist without updating both the Admin editor
 * toolbar and this comment in the same change.
 */

// Block/inline tags the toolbar can produce.
// Added in A10-B: `u` (Underline), `s` (Strike), `hr` (HorizontalRule),
//   `a` (Link). `br` covers Tiptap hard-break (Shift+Enter). Text alignment
//   adds a `text-align` inline style on p/h2/h3 (see allowedStyles), not a tag.
// Added in A10-C:
//   - `span` : carrier for TextStyle typography marks (font-size / font-family
//     / color), all serialized as inline `style` on <span>.
//   - `mark` : carrier for Highlight (background-color), serialized as inline
//     `style` on <mark>.
// Still no `h1` (the Article title owns the page H1).
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
  "span",
  "mark",
  // A10-D Table V1 — deliberately just these five. No thead/tfoot/colgroup/
  // col (see policy note above).
  "table",
  "tbody",
  "tr",
  "th",
  "td",
  // A10-E — the ONLY iframe shape this allowlist permits is the canonical
  // YouTube embed rebuilt by `transformTags.iframe` below. See that
  // transform and `exclusiveFilter` for the actual security boundary; this
  // tag entry alone does not widen the contract to arbitrary iframes.
  "iframe",
]

// Attribute allowlist for A10-B.
//   - `a`: `href` is validated against the scheme allowlist below;
//     `target`/`rel` are permitted so the editor's external-link behavior
//     (target="_blank") and the transformTags-enforced safe `rel` survive.
//   - `p`/`h2`/`h3`: `style` MUST be listed here for the text-align
//     alignment to survive. In sanitize-html, `allowedStyles` only FILTERS
//     the VALUES of a `style` attribute that has ALREADY been permitted via
//     `allowedAttributes`; if `style` is not allowed on the tag, the whole
//     attribute is stripped BEFORE `allowedStyles` runs (this was the
//     A10-B-FIX1 root cause). `allowedStyles` below then narrows the
//     surviving `style` to ONLY `text-align: left|center|right` — no other
//     property (color/font/position/etc.) can pass, so exposing `style`
//     here does NOT open an arbitrary-style channel.
//   - `span`/`mark` (A10-C): `style` MUST be listed so the typography
//     properties can survive to be narrowed by `allowedStyles` below (same
//     sanitize-html semantics as the A10-B-FIX1 text-align fix). No other
//     attribute is allowed on span/mark, so the Highlight extension's
//     `data-color` is intentionally stripped — the authoritative color is
//     the validated inline `background-color`, and Highlight round-trips
//     losslessly from the raw style string on reload.
export const ARTICLE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  p: ["style"],
  h2: ["style"],
  h3: ["style"],
  span: ["style"],
  mark: ["style"],
  // A10-E — only the exact attributes the canonical YouTube iframe needs.
  // `transformTags.iframe` below REBUILDS these from scratch for every
  // surviving iframe, so listing them here does not let an attacker pass
  // arbitrary values through — it only lets our own rebuilt values survive.
  iframe: ["src", "title", "class", "allowfullscreen"],
}

/**
 * A10-E — canonical YouTube video ID shape, byte-identical to the editor's
 * own `YOUTUBE_VIDEO_ID_PATTERN` in rich-text-editor.tsx. Keep both in sync.
 */
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/** Embed hostnames accepted as INPUT. Output is always rewritten to the
 * privacy-enhanced `www.youtube-nocookie.com` domain — see
 * `extractYoutubeVideoIdFromEmbedSrc` below. */
const YOUTUBE_EMBED_INPUT_HOSTNAMES = new Set(["www.youtube-nocookie.com", "www.youtube.com"])

/**
 * Validates an incoming iframe `src` and, if and only if it is EXACTLY a
 * YouTube embed URL for a well-formed video ID, returns that video ID.
 * Returns `null` for anything else — including non-YouTube hosts, non-https
 * protocols (`javascript:`, `data:`, etc.), non-`/embed/` paths (e.g. a raw
 * `/watch?v=` URL used directly as an iframe src), and malformed IDs.
 *
 * This is the ACTUAL security boundary for A10-E iframe support — NOT
 * `allowedIframeHostnames` (see `sanitizeArticleContentHtml` below, which
 * sets that option too, purely as defense-in-depth on top of this check,
 * per the "do not rely only on allowedIframeHostnames" policy).
 */
function extractYoutubeVideoIdFromEmbedSrc(rawSrc: string): string | null {
  let url: URL
  try {
    url = new URL(rawSrc)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  if (!YOUTUBE_EMBED_INPUT_HOSTNAMES.has(url.hostname.toLowerCase())) return null
  if (!url.pathname.startsWith("/embed/")) return null

  const videoId = url.pathname.slice("/embed/".length).split("/")[0]
  if (!videoId || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) return null
  return videoId
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
    // CLOSED style allowlist. sanitize-html matches each regex against the
    // trimmed property value; anything not matched is dropped. These values
    // MUST stay byte-identical to the editor dropdown constants in
    // rich-text-editor.tsx (FONT_SIZES / FONT_FAMILIES / TEXT_COLORS /
    // HIGHLIGHTS) — see the policy note at the top of this file.
    allowedStyles: {
      // Block alignment (A10-B) — TextAlign emits text-align on p/h2/h3.
      p: { "text-align": [/^(left|center|right)$/] },
      h2: { "text-align": [/^(left|center|right)$/] },
      h3: { "text-align": [/^(left|center|right)$/] },
      // Typography marks (A10-C) — TextStyle serializes font-size /
      // font-family / color onto <span>. Each is a FIXED allowlist:
      span: {
        "font-size": [/^(0\.875|1\.25|1\.5)rem$/],
        // Updated in A10-C-FONT-FAMILY-FIX1: 襯線體 now emits
        // `var(--font-noto-serif-tc), serif` (this app's own already-loaded
        // Noto Serif TC design token, mirroring `--font-serif` in
        // app/globals.css) instead of the bare `serif` keyword, which was
        // found to be visually indistinguishable from every other generic
        // font keyword for Traditional Chinese text. This is still a tight
        // ENUMERATED allowlist of exactly two literal strings — not a
        // pattern that accepts arbitrary `var(...)` references — so no
        // arbitrary font-family (or CSS injection via a crafted custom
        // property name) can pass through Source mode.
        "font-family": [/^(var\(--font-noto-serif-tc\), serif|monospace)$/],
        // Updated in A10-C-TEXT-COLOR-PERSISTENCE-FIX1: browsers (via
        // Tiptap's TextStyle mark) serialize an applied `color` as
        // `rgb(r, g, b)`, not the hex string the toolbar's swatch `value`
        // is defined in — so the hex-only regex was silently stripping
        // every color choice on save. This accepts BOTH the hex form (for
        // hand-written Source mode input) AND the exact rgb() serialization
        // of each of the same 5 approved colors, with optional whitespace
        // after each comma (matching browser `getComputedStyle` output).
        // This is still a closed, enumerated palette — not a general rgb()
        // pattern — so no arbitrary color (and no rgba()/named/var() color)
        // can pass. The two forms MUST stay in sync with each other and
        // with TEXT_COLORS in rich-text-editor.tsx.
        color: [
          /^#(262524|6b6a67|c2703d|3d4a5c|b3261e)$/i,
          /^rgb\(\s*(38,\s*37,\s*36|107,\s*106,\s*103|194,\s*112,\s*61|61,\s*74,\s*92|179,\s*38,\s*30)\s*\)$/,
        ],
      },
      // Highlight (A10-C) — serialized as background-color onto <mark>.
      mark: {
        "background-color": [/^#(fef3c7|dcfce7|dbeafe|fce7f3|ffedd5)$/i],
      },
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
      // A10-E — REBUILD, do not pass through. For every incoming `iframe`,
      // independently re-derive a YouTube video ID from `src` and, if valid,
      // replace ALL attributes with the exact canonical set below (ignoring
      // whatever `class`/other attributes the incoming markup carried — the
      // incoming `class` is NEVER trusted). If no valid video ID can be
      // derived, strip the attributes down to nothing, which never matches
      // the canonical `youtube-embed` class `exclusiveFilter` requires below
      // — so the tag (and its inbound attributes) is dropped entirely, not
      // left behind as an empty/partial iframe.
      iframe: (tagName, attribs) => {
        const videoId = extractYoutubeVideoIdFromEmbedSrc(attribs.src ?? "")
        const out: sanitizeHtml.IFrame["attribs"] = videoId
          ? {
              class: "youtube-embed",
              src: `https://www.youtube-nocookie.com/embed/${videoId}`,
              title: "YouTube video player",
              allowfullscreen: "true",
            }
          : {}
        return { tagName, attribs: out }
      },
    },
    // A10-E — final removal pass for any iframe that didn't survive
    // `transformTags.iframe` as the exact canonical YouTube shape (invalid
    // host/protocol/path/video ID). This fully excludes the tag rather than
    // leaving an empty or partially-stripped iframe behind.
    exclusiveFilter: (frame) => frame.tag === "iframe" && frame.attribs.class !== "youtube-embed",
    // Defense-in-depth on top of the `transformTags.iframe` rebuild above —
    // NOT the primary security boundary (see that function's doc comment).
    allowedIframeHostnames: ["www.youtube-nocookie.com"],
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
