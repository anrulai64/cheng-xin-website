"use client"

import * as React from "react"
import { useEditor, EditorContent, useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextAlign } from "@tiptap/extension-text-align"
// A10-C typography. In TipTap v3 the TextStyle mark plus its Color /
// FontSize / FontFamily global attributes all ship from a single package
// (@tiptap/extension-text-style); Highlight is its own package. All are
// pinned to the installed 3.30.1 line. These add NO parsing of arbitrary
// styles that survive the server sanitizer — the sanitizer is authoritative.
import { TextStyle, Color, FontSize, FontFamily } from "@tiptap/extension-text-style"
import { Highlight } from "@tiptap/extension-highlight"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CaseSensitive,
  Code,
  Eye,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (html: string) => void
  ariaLabel?: string
  minHeightClass?: string
}

/**
 * Article CMS RichText editor — A10-B "Core Editor Foundation".
 *
 * Extends the original A5-A TipTap editor (paragraph, H2/H3, bold/italic,
 * lists, blockquote, undo/redo) with:
 *   - a Visual ↔ Source/HTML mode toggle,
 *   - Underline, Strikethrough,
 *   - Text alignment (left/center/right),
 *   - Horizontal rule,
 *   - Link insert / edit / remove.
 *
 * Architecture is UNCHANGED: still TipTap v3, still emits/consumes a single
 * canonical `content_html` string via the value/onChange contract below.
 * This component owns NO Supabase client, calls NO Server Action, persists
 * NOTHING, and is NOT a security boundary — the authoritative sanitizer is
 * lib/articles/sanitize.ts, applied server-side on save and again on public
 * render. Source mode is therefore NOT a sanitizer bypass.
 *
 * A10-C adds CONTROLLED typography on top of that foundation: font size,
 * font family, text color, and highlight — each restricted to a fixed
 * palette (see FONT_SIZES / FONT_FAMILIES / TEXT_COLORS / HIGHLIGHTS below)
 * that is mirrored exactly by the server sanitizer's closed style allowlist.
 * There is NO free-form color picker, arbitrary font, or open size input.
 *
 * A10-C deliberately still does NOT add image, table, or YouTube controls —
 * those are later A10 STEPS.
 *
 * TipTap features here ship from @tiptap/starter-kit@3 (Underline, Strike,
 * HorizontalRule, Link), @tiptap/extension-text-align, and — new in A10-C —
 * @tiptap/extension-text-style (TextStyle/Color/FontSize/FontFamily) and
 * @tiptap/extension-highlight, all pinned to the installed 3.30.1 line.
 */

/** Small toolbar button. type="button" so it never submits the form. */
function TB({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-transparent px-1.5 text-sm transition-colors",
        "hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
        active && "border-border bg-muted font-semibold text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border" />
}

/**
 * CONTROLLED TYPOGRAPHY PALETTES (A10-C).
 *
 * These are the ONLY typography values the editor can produce. Each value is
 * a single canonical string (fixed rem / CSS generic keyword / #rrggbb hex)
 * so it round-trips byte-identically through save → DB → edit reload without
 * canonicalization drift, and requires NO CSS `var()` (which the sanitizer
 * rejects).
 *
 * They MUST stay byte-identical to the `allowedStyles` regexes in
 * lib/articles/sanitize.ts. If they diverge, valid editor output would be
 * silently stripped on save. Update BOTH files together.
 */
const FONT_SIZES: ReadonlyArray<{ label: string; value: string }> = [
  { label: "小", value: "0.875rem" },
  { label: "大", value: "1.25rem" },
  { label: "特大", value: "1.5rem" },
]
const FONT_FAMILIES: ReadonlyArray<{ label: string; value: string }> = [
  { label: "襯線體", value: "serif" },
  { label: "等寬體", value: "monospace" },
]
const TEXT_COLORS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "深色", value: "#262524" },
  { label: "灰色", value: "#6b6a67" },
  { label: "品牌橘", value: "#c2703d" },
  { label: "深藍", value: "#3d4a5c" },
  { label: "紅色", value: "#b3261e" },
]
const HIGHLIGHTS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "黃", value: "#fef3c7" },
  { label: "綠", value: "#dcfce7" },
  { label: "藍", value: "#dbeafe" },
  { label: "粉", value: "#fce7f3" },
  { label: "橘", value: "#ffedd5" },
]

/** A small colored swatch button used by the color / highlight menus. */
function Swatch({
  color,
  label,
  active,
  onClick,
}: {
  color: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "size-6 rounded-full border transition-transform hover:scale-110",
        active ? "border-foreground ring-2 ring-ring ring-offset-1" : "border-border",
      )}
      style={{ backgroundColor: color }}
    />
  )
}

/**
 * A toolbar dropdown menu (details/summary) that closes on selection.
 * Used for the four typography controls so the toolbar stays compact.
 */
function Menu({
  icon,
  title,
  active,
  children,
}: {
  icon: React.ReactNode
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDetailsElement>(null)
  // Close the menu whenever the user clicks outside it.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])
  return (
    <details ref={ref} className="relative">
      <summary
        title={title}
        aria-label={title}
        className={cn(
          "inline-flex h-8 min-w-8 cursor-pointer list-none items-center justify-center gap-0.5 rounded-md border border-transparent px-1.5 text-sm transition-colors",
          "hover:bg-muted [&::-webkit-details-marker]:hidden",
          active && "border-border bg-muted font-semibold text-foreground",
        )}
      >
        {icon}
      </summary>
      <div
        className="absolute left-0 top-full z-20 mt-1 min-w-40 rounded-md border border-border bg-popover p-2 shadow-md"
        onClick={(e) => {
          // Collapse the menu after any interior click (selection made).
          const d = e.currentTarget.closest("details")
          if (d) d.open = false
        }}
      >
        {children}
      </div>
    </details>
  )
}

export function RichTextEditor({ value, onChange, ariaLabel, minHeightClass }: Props) {
  const [mode, setMode] = React.useState<"visual" | "source">("visual")
  const [sourceDraft, setSourceDraft] = React.useState(value)
  const [notice, setNotice] = React.useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      // Only H2/H3 are enabled — the Article title owns the page H1, so no
      // editorial control ever offers H1 (see A5-A §11). StarterKit v3
      // bundles Underline, Strike, HorizontalRule and Link; Link is
      // configured (not disabled) here so link marks round-trip.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          // No global rel/target here. Article link rel/target policy is
          // enforced authoritatively by the server sanitizer
          // (lib/articles/sanitize.ts): internal links stay plain and
          // crawlable; external new-tab links get noopener/noreferrer but
          // NOT nofollow. The editor only records href + optional target.
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      // A10-C controlled typography. TextStyle is the base <span> mark that
      // Color / FontSize / FontFamily attach their inline styles to; the
      // editor only ever sets values from the fixed palettes above, and the
      // server sanitizer independently enforces that same closed allowlist.
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn("tiptap focus:outline-none", minHeightClass ?? "min-h-[12rem]"),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel ?? "文章內容編輯器",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Reactive toolbar state (per-transaction re-render disabled for perf).
  const state = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: Editor | null }) => ({
      isParagraph: e?.isActive("paragraph") ?? false,
      isH2: e?.isActive("heading", { level: 2 }) ?? false,
      isH3: e?.isActive("heading", { level: 3 }) ?? false,
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isUnderline: e?.isActive("underline") ?? false,
      isStrike: e?.isActive("strike") ?? false,
      isBullet: e?.isActive("bulletList") ?? false,
      isOrdered: e?.isActive("orderedList") ?? false,
      isQuote: e?.isActive("blockquote") ?? false,
      isLink: e?.isActive("link") ?? false,
      isLeft: e?.isActive({ textAlign: "left" }) ?? false,
      isCenter: e?.isActive({ textAlign: "center" }) ?? false,
      isRight: e?.isActive({ textAlign: "right" }) ?? false,
      // Current typography marks at the selection (null when unset).
      fontSize: (e?.getAttributes("textStyle").fontSize as string | undefined) ?? null,
      fontFamily: (e?.getAttributes("textStyle").fontFamily as string | undefined) ?? null,
      color: (e?.getAttributes("textStyle").color as string | undefined) ?? null,
      highlight: (e?.getAttributes("highlight").color as string | undefined) ?? null,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  })

  // Visual → Source: capture current editor HTML, push it into the source
  // draft AND up to the parent so a Save from Source mode submits it.
  function switchToSource() {
    const html = editor?.getHTML() ?? value
    setSourceDraft(html)
    onChange(html)
    setMode("source")
  }

  // Source → Visual: load the raw source into TipTap WITHOUT emitting an
  // update, so the stored value stays byte-identical until the admin
  // actually edits in visual mode (avoids destructive re-normalization just
  // by viewing). Also mirror the draft up so parent state is coherent.
  function switchToVisual() {
    editor?.commands.setContent(sourceDraft, { emitUpdate: false })
    onChange(sourceDraft)
    setMode("visual")
  }

  // Every source keystroke is the canonical body while in source mode, so
  // push it straight to the parent — a Save from source submits exactly this.
  function handleSourceChange(next: string) {
    setSourceDraft(next)
    onChange(next)
  }

  function setLink() {
    if (!editor) return
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("請輸入連結網址（留空以移除連結）", prev ?? "https://")
    if (url === null) return
    const trimmed = url.trim()
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      setNotice(null)
      return
    }
    // Client-side guard mirrors (but does not replace) the server allowlist:
    // http/https/mailto/tel or an internal root-relative path.
    if (!/^(https?:|mailto:|tel:|\/)/i.test(trimmed)) {
      setNotice("連結網址格式不安全，僅接受 http、https、mailto、tel 或以 / 開頭的站內路徑。")
      return
    }
    setNotice(null)
    // External absolute links open in a new tab; internal (/...) links stay
    // in-tab. The server sanitizer enforces the final rel/target contract.
    const isExternal = /^(https?:|mailto:|tel:)/i.test(trimmed)
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink(isExternal ? { href: trimmed, target: "_blank" } : { href: trimmed, target: null })
      .run()
  }

  return (
    <div className="rounded-lg border border-input bg-background">
      {/* Mode switch */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <button
          type="button"
          onClick={() => mode !== "visual" && switchToVisual()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
            mode === "visual" ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Eye className="size-3.5" />
          視覺編輯
        </button>
        <button
          type="button"
          onClick={() => mode !== "source" && switchToSource()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
            mode === "source" ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Code className="size-3.5" />
          HTML 原始碼
        </button>
      </div>

      {mode === "visual" ? (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
            {/* Block */}
            <TB title="內文段落" active={state?.isParagraph} onClick={() => editor?.chain().focus().setParagraph().run()}>
              <Pilcrow className="size-4" />
            </TB>
            <TB title="標題 H2" active={state?.isH2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="size-4" />
            </TB>
            <TB title="標題 H3" active={state?.isH3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="size-4" />
            </TB>
            <Divider />
            {/* Inline */}
            <TB title="粗體" active={state?.isBold} onClick={() => editor?.chain().focus().toggleBold().run()}>
              <Bold className="size-4" />
            </TB>
            <TB title="斜體" active={state?.isItalic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
              <Italic className="size-4" />
            </TB>
            <TB title="底線" active={state?.isUnderline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="size-4" />
            </TB>
            <TB title="刪除線" active={state?.isStrike} onClick={() => editor?.chain().focus().toggleStrike().run()}>
              <Strikethrough className="size-4" />
            </TB>
            <TB title="插入／編輯連結" active={state?.isLink} onClick={setLink}>
              <LinkIcon className="size-4" />
            </TB>
            <TB title="移除連結" disabled={!state?.isLink} onClick={() => editor?.chain().focus().unsetLink().run()}>
              <Unlink className="size-4" />
            </TB>
            <Divider />
            {/* List / block */}
            <TB title="項目符號清單" active={state?.isBullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              <List className="size-4" />
            </TB>
            <TB title="編號清單" active={state?.isOrdered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="size-4" />
            </TB>
            <TB title="引言區塊" active={state?.isQuote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              <Quote className="size-4" />
            </TB>
            <TB title="水平分隔線" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              <Minus className="size-4" />
            </TB>
            <Divider />
            {/* Align */}
            <TB title="靠左對齊" active={state?.isLeft} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
              <AlignLeft className="size-4" />
            </TB>
            <TB title="置中對齊" active={state?.isCenter} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
              <AlignCenter className="size-4" />
            </TB>
            <TB title="靠右對齊" active={state?.isRight} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="size-4" />
            </TB>
            <Divider />
            {/* Typography (A10-C) */}
            <Menu icon={<CaseSensitive className="size-4" />} title="字體" active={Boolean(state?.fontFamily)}>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => editor?.chain().focus().unsetFontFamily().run()}
                >
                  預設
                </button>
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={cn(
                      "rounded px-2 py-1 text-left text-sm hover:bg-muted",
                      state?.fontFamily === f.value && "bg-muted font-semibold",
                    )}
                    style={{ fontFamily: f.value }}
                    onClick={() => editor?.chain().focus().setFontFamily(f.value).run()}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </Menu>
            <Menu icon={<Type className="size-4" />} title="字級" active={Boolean(state?.fontSize)}>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => editor?.chain().focus().unsetFontSize().run()}
                >
                  正常
                </button>
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={cn(
                      "rounded px-2 py-1 text-left text-sm hover:bg-muted",
                      state?.fontSize === f.value && "bg-muted font-semibold",
                    )}
                    style={{ fontSize: f.value }}
                    onClick={() => editor?.chain().focus().setFontSize(f.value).run()}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </Menu>
            <Menu icon={<Baseline className="size-4" />} title="文字顏色" active={Boolean(state?.color)}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <Swatch
                      key={c.value}
                      color={c.value}
                      label={c.label}
                      active={state?.color === c.value}
                      onClick={() => editor?.chain().focus().setColor(c.value).run()}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => editor?.chain().focus().unsetColor().run()}
                >
                  清除顏色
                </button>
              </div>
            </Menu>
            <Menu icon={<Highlighter className="size-4" />} title="螢光標記" active={Boolean(state?.highlight)}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {HIGHLIGHTS.map((h) => (
                    <Swatch
                      key={h.value}
                      color={h.value}
                      label={h.label}
                      active={state?.highlight === h.value}
                      onClick={() => editor?.chain().focus().setHighlight({ color: h.value }).run()}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => editor?.chain().focus().unsetHighlight().run()}
                >
                  清除標記
                </button>
              </div>
            </Menu>
            <Divider />
            {/* History */}
            <TB title="復原" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 className="size-4" />
            </TB>
            <TB title="重做" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 className="size-4" />
            </TB>
          </div>

          <EditorContent editor={editor} className="px-3 py-2" />
        </>
      ) : (
        <textarea
          aria-label={`${ariaLabel ?? "文章內容"} HTML 原始碼`}
          value={sourceDraft}
          onChange={(e) => handleSourceChange(e.target.value)}
          spellCheck={false}
          className={cn(
            "w-full resize-y rounded-b-lg bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none",
            minHeightClass ?? "min-h-[12rem]",
          )}
        />
      )}

      {notice ? (
        <p role="alert" className="border-t px-3 py-2 text-xs text-destructive">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
