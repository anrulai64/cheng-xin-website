"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  ImageOff,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  deleteCaseImage,
  reorderCaseImages,
  updateImageAlt,
  uploadCaseImages,
} from "./image-actions"

export type CaseImageRow = {
  id: string
  storage_path: string
  public_url: string | null
  alt_text: string | null
  sort_order: number
}

type Feedback =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

export function CaseImageManager({
  caseId,
  initialImages,
}: {
  caseId: string
  initialImages: CaseImageRow[]
}) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [items, setItems] = React.useState<CaseImageRow[]>(initialImages)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [uploading, setUploading] = React.useState(false)
  const [feedback, setFeedback] = React.useState<Feedback>({ kind: "idle" })

  // Per-image local ALT drafts + busy flags.
  const [altDrafts, setAltDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(initialImages.map((i) => [i.id, i.alt_text ?? ""])),
  )
  const [rowBusy, setRowBusy] = React.useState<Record<string, boolean>>({})

  // Drag-and-drop state (native HTML DnD, same approach as category sorting).
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [overIndex, setOverIndex] = React.useState<number | null>(null)
  const [savingOrder, setSavingOrder] = React.useState(false)

  // Keep local state in sync when the server data changes after refresh.
  React.useEffect(() => {
    setItems(initialImages)
    setAltDrafts(Object.fromEntries(initialImages.map((i) => [i.id, i.alt_text ?? ""])))
  }, [initialImages])

  const orderDirty = React.useMemo(
    () => items.some((item, i) => item.id !== initialImages[i]?.id),
    [items, initialImages],
  )

  // ---------------------------------------------------------------- upload ---
  async function handleUpload() {
    const input = fileInputRef.current
    if (!input || !input.files || input.files.length === 0) {
      setFeedback({ kind: "error", message: "請先選擇要上傳的圖片。" })
      return
    }

    const formData = new FormData()
    Array.from(input.files).forEach((file) => formData.append("images", file))

    setUploading(true)
    setFeedback({ kind: "idle" })
    const result = await uploadCaseImages(caseId, formData)
    setUploading(false)

    if (result.ok) {
      setFeedback({ kind: "success", message: `已成功上傳 ${result.uploaded} 張圖片。` })
      input.value = ""
      setSelectedCount(0)
      router.refresh()
    } else {
      setFeedback({ kind: "error", message: result.error ?? "圖片上傳失敗。" })
      if (result.uploaded > 0) {
        input.value = ""
        setSelectedCount(0)
        router.refresh()
      }
    }
  }

  // ------------------------------------------------------------------ alt ---
  async function handleSaveAlt(imageId: string) {
    setRowBusy((prev) => ({ ...prev, [imageId]: true }))
    setFeedback({ kind: "idle" })
    const result = await updateImageAlt(caseId, imageId, altDrafts[imageId] ?? "")
    setRowBusy((prev) => ({ ...prev, [imageId]: false }))

    if (result.ok) {
      setFeedback({ kind: "success", message: "ALT 文字已儲存。" })
      router.refresh()
    } else {
      setFeedback({ kind: "error", message: result.error })
    }
  }

  // --------------------------------------------------------------- delete ---
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null)

  async function handleDelete(imageId: string) {
    setRowBusy((prev) => ({ ...prev, [imageId]: true }))
    setFeedback({ kind: "idle" })
    const result = await deleteCaseImage(caseId, imageId)
    setRowBusy((prev) => ({ ...prev, [imageId]: false }))
    setConfirmingId(null)

    if (result.ok) {
      setFeedback({ kind: "success", message: "圖片已刪除。" })
      router.refresh()
    } else {
      setFeedback({ kind: "error", message: result.error })
    }
  }

  // ----------------------------------------------------------- reordering ---
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setFeedback({ kind: "idle" })
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      move(index, index - 1)
      requestAnimationFrame(() => focusHandle(index - 1))
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      move(index, index + 1)
      requestAnimationFrame(() => focusHandle(index + 1))
    }
  }

  function focusHandle(index: number) {
    document
      .querySelector<HTMLButtonElement>(`[data-image-handle="${index}"]`)
      ?.focus()
  }

  async function handleSaveOrder() {
    setSavingOrder(true)
    setFeedback({ kind: "idle" })
    const result = await reorderCaseImages(
      caseId,
      items.map((i) => i.id),
    )
    setSavingOrder(false)
    if (result.ok) {
      setFeedback({ kind: "success", message: "圖片排序已儲存。" })
      router.refresh()
    } else {
      setFeedback({ kind: "error", message: result.error })
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-bold text-foreground">案例圖片</h2>
        <p className="text-sm text-muted-foreground">
          支援多張圖片上傳（單檔上限 8 MB，僅限圖片格式）。上傳後可編輯 ALT 文字、拖曳排序或刪除。
        </p>
      </div>

      {/* Upload controls */}
      <div className="flex flex-col gap-3 rounded-md border border-dashed p-4 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setSelectedCount(e.target.files?.length ?? 0)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          aria-label="選擇圖片"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || selectedCount === 0}
          className={cn(buttonVariants({ size: "default" }), "shrink-0 gap-1")}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          上傳圖片{selectedCount > 0 ? `（${selectedCount}）` : ""}
        </button>
      </div>

      {/* Feedback banner */}
      {feedback.kind === "success" ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      ) : null}
      {feedback.kind === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">目前尚未上傳案例圖片。</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3" role="list">
            {items.map((image, index) => {
              const isDragging = dragIndex === index
              const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
              const busy = rowBusy[image.id] === true
              return (
                <li
                  key={image.id}
                  draggable
                  onDragStart={() => {
                    setDragIndex(index)
                    setFeedback({ kind: "idle" })
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (index !== overIndex) setOverIndex(index)
                  }}
                  onDrop={() => {
                    if (dragIndex !== null) move(dragIndex, index)
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border bg-background p-3 transition-colors sm:flex-row sm:items-start",
                    isDragging && "opacity-50",
                    isOver && "border-primary bg-accent",
                  )}
                >
                  <div className="flex items-center gap-2 sm:flex-col sm:items-center">
                    <button
                      type="button"
                      data-image-handle={index}
                      aria-label={`拖曳或使用上下方向鍵調整第 ${index + 1} 張圖片的順序，共 ${items.length} 張`}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" aria-hidden />
                    </button>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {image.public_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.public_url || "/placeholder.svg"}
                        alt={image.alt_text ?? ""}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff className="size-6 text-muted-foreground" aria-hidden />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label
                      htmlFor={`alt-${image.id}`}
                      className="text-sm font-medium text-foreground"
                    >
                      ALT 文字
                    </label>
                    <input
                      id={`alt-${image.id}`}
                      type="text"
                      value={altDrafts[image.id] ?? ""}
                      onChange={(e) =>
                        setAltDrafts((prev) => ({ ...prev, [image.id]: e.target.value }))
                      }
                      placeholder="請輸入圖片替代文字（選填）"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAlt(image.id)}
                        disabled={busy}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1",
                        )}
                      >
                        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        儲存 ALT
                      </button>

                      {confirmingId === image.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">確定刪除？</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(image.id)}
                            disabled={busy}
                            className={cn(
                              buttonVariants({ variant: "destructive", size: "sm" }),
                              "gap-1",
                            )}
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : null}
                            確定
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={busy}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          >
                            取消
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(image.id)}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "gap-1 text-destructive hover:text-destructive",
                          )}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Save-order controls (only shown when order changed) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={savingOrder || !orderDirty}
              className={cn(buttonVariants({ size: "default" }), "gap-1")}
            >
              {savingOrder ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              儲存排序
            </button>
            {orderDirty && !savingOrder ? (
              <button
                type="button"
                onClick={() => setItems(initialImages)}
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                還原
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">拖曳圖片以調整順序</span>
            )}
          </div>
        </>
      )}
    </section>
  )
}
