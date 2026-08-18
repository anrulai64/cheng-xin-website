"use client"

import * as React from "react"
import { useEditor, EditorContent, useEditorState } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextAlign } from "@tiptap/extension-text-align"
import { Image as TiptapImage } from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { uploadContentImage } from "./content-image-actions"

type Props = {
  value: string
  onChange: (html: string) => void
  /** When provided (edit mode), enables inline image upload for this case. */
  caseId?: string
  ariaLabel?: string
  minHeightClass?: string
}

/** Small toolbar button. Uses type="button" so it never submits the form. */
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

export function RichTextEditor({ value, onChange, caseId, ariaLabel, minHeightClass }: Props) {
  const [mode, setMode] = React.useState<"visual" | "source">("visual")
  const [sourceDraft, setSourceDraft] = React.useState(value)
  const [uploading, setUploading] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapImage.configure({
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full h-auto rounded-md" },
      }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn("tiptap focus:outline-none", minHeightClass ?? "min-h-[16rem]"),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel ?? "內容編輯器",
        spellcheck: "false",
      },
    },
    // Only propagate genuine user edits — never the initial mount.
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Reactive toolbar state (we disabled per-transaction re-render for perf).
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
      inTable: e?.isActive("table") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  })

  function switchToSource() {
    const html = editor?.getHTML() ?? value
    setSourceDraft(html)
    onChange(html)
    setMode("source")
  }

  function switchToVisual() {
    // Load the raw source into the editor WITHOUT emitting an update, so the
    // stored value stays byte-for-byte identical until the admin actually
    // edits in visual mode (avoids destructive re-normalization on view).
    editor?.commands.setContent(sourceDraft, { emitUpdate: false })
    onChange(sourceDraft)
    setMode("visual")
  }

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
      return
    }
    // Only allow safe schemes.
    if (!/^(https?:|mailto:|tel:|\/)/i.test(trimmed)) {
      setNotice("連結網址格式不安全，僅接受 http、https、mailto、tel 或站內路徑。")
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run()
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file || !editor || !caseId) return

    setUploading(true)
    setNotice(null)
    try {
      const fd = new FormData()
      fd.set("file", file)
      const result = await uploadContentImage(caseId, fd)
      if (!result.ok) {
        setNotice(result.error)
        return
      }
      editor.chain().focus().setImage({ src: result.url, alt: file.name }).run()
    } catch (err) {
      console.error("[v0] content image upload failed", err)
      setNotice("圖片上傳發生非預期錯誤，請稍後再試。")
    } finally {
      setUploading(false)
    }
  }

  const canInsertImage = Boolean(caseId)

  return (
    <div className="rounded-lg border border-input bg-background">
      {/* Mode switch */}
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <div className="flex items-center gap-1">
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
      </div>

      {mode === "visual" ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
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
            <Divider />
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
            <TB title="插入／編輯連結" active={state?.isLink} onClick={setLink}>
              <LinkIcon className="size-4" />
            </TB>
            <TB title="移除連結" disabled={!state?.isLink} onClick={() => editor?.chain().focus().unsetLink().run()}>
              <Unlink className="size-4" />
            </TB>
            <Divider />
            <TB
              title="插入表格"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <TableIcon className="size-4" />
            </TB>
            <TB
              title={canInsertImage ? "上傳並插入圖片" : "請先儲存案例後才能上傳內文圖片"}
              disabled={!canInsertImage || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            </TB>
            <Divider />
            <TB title="復原" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 className="size-4" />
            </TB>
            <TB title="重做" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 className="size-4" />
            </TB>
          </div>

          {/* Contextual table controls (only when the caret is inside a table) */}
          {state?.inTable ? (
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5 text-xs">
              <span className="text-muted-foreground">表格：</span>
              <button type="button" className="rounded border px-1.5 py-0.5 hover:bg-background" onClick={() => editor?.chain().focus().addRowAfter().run()}>
                加一列
              </button>
              <button type="button" className="rounded border px-1.5 py-0.5 hover:bg-background" onClick={() => editor?.chain().focus().deleteRow().run()}>
                刪除列
              </button>
              <button type="button" className="rounded border px-1.5 py-0.5 hover:bg-background" onClick={() => editor?.chain().focus().addColumnAfter().run()}>
                加一欄
              </button>
              <button type="button" className="rounded border px-1.5 py-0.5 hover:bg-background" onClick={() => editor?.chain().focus().deleteColumn().run()}>
                刪除欄
              </button>
              <button type="button" className="rounded border px-1.5 py-0.5 text-destructive hover:bg-background" onClick={() => editor?.chain().focus().deleteTable().run()}>
                刪除表格
              </button>
            </div>
          ) : null}

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePickImage} />

          <EditorContent editor={editor} className="px-3 py-2" />
        </>
      ) : (
        <textarea
          aria-label={`${ariaLabel ?? "內容"} HTML 原始碼`}
          value={sourceDraft}
          onChange={(e) => handleSourceChange(e.target.value)}
          spellCheck={false}
          className={cn(
            "w-full resize-y rounded-b-lg bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none",
            minHeightClass ?? "min-h-[16rem]",
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
