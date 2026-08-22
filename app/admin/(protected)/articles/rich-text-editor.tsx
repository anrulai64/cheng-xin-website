"use client"

import * as React from "react"
import { useEditor, EditorContent, useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Quote, Redo2, Undo2 } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (html: string) => void
  ariaLabel?: string
  minHeightClass?: string
}

/**
 * Article CMS RichText editor foundation (STEP A5-A).
 *
 * Scope-locked to a small, maintainable feature set: paragraph, H2/H3,
 * bold/italic, bullet/ordered list, blockquote, undo/redo. Deliberately
 * excludes image upload, tables, text alignment, links, and a raw-HTML
 * source mode — those are out of scope for this STEP (see A5-A spec).
 *
 * This component is presentation/state only: it owns no Supabase client,
 * calls no Server Action, and never persists anything. The caller
 * (ArticleForm) owns the canonical `content_html` string via the
 * value/onChange contract below.
 */

/** Small toolbar button. Uses type="button" so it never submits the form. */
function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
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

function ToolbarDivider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border" />
}

export function RichTextEditor({ value, onChange, ariaLabel, minHeightClass }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      // Only H2/H3 are enabled — the Article title owns the page H1, so no
      // editorial control ever offers H1 (see A5-A §11).
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
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
      isBullet: e?.isActive("bulletList") ?? false,
      isOrdered: e?.isActive("orderedList") ?? false,
      isQuote: e?.isActive("blockquote") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  })

  return (
    <div className="rounded-lg border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <ToolbarButton
          label="內文段落"
          active={state?.isParagraph}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="標題 H2"
          active={state?.isH2}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="標題 H3"
          active={state?.isH3}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="粗體" active={state?.isBold} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="斜體"
          active={state?.isItalic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="項目符號清單"
          active={state?.isBullet}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="編號清單"
          active={state?.isOrdered}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="引言區塊"
          active={state?.isQuote}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="復原" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="重做" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} className="px-3 py-2" />
    </div>
  )
}
