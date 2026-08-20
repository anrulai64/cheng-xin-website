"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { isHtmlContentEmpty } from "@/lib/admin/cases/html"
import { RichTextEditor } from "../rich-text-editor"
import {
  createCaseFaq,
  deleteCaseFaq,
  reorderCaseFaqs,
  setCaseFaqVisibility,
  updateCaseFaq,
} from "./actions"

export type AdminFaqRow = {
  id: string
  question: string
  answer_html: string
  sort_order: number
  is_visible: boolean
}

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

// null = editor closed; "create" = new FAQ; string = editing that FAQ id.
type EditorTarget = "create" | string | null

export function FaqManager({ initial }: { initial: AdminFaqRow[] }) {
  const router = useRouter()
  const [items, setItems] = React.useState<AdminFaqRow[]>(initial)
  const [editorTarget, setEditorTarget] = React.useState<EditorTarget>(null)
  const [status, setStatus] = React.useState<Status>({ kind: "idle" })
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  // Reorder state (mirrors the existing case sort list pattern).
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [overIndex, setOverIndex] = React.useState<number | null>(null)
  const [savingOrder, setSavingOrder] = React.useState(false)

  // Re-sync when the server data changes (refresh after a successful mutation).
  React.useEffect(() => {
    setItems(initial)
  }, [initial])

  const isDirty = React.useMemo(
    () => items.some((item, i) => item.id !== initial[i]?.id),
    [items, initial],
  )

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setStatus({ kind: "idle" })
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (index !== overIndex) setOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex !== null) moveItem(dragIndex, index)
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      moveItem(index, index - 1)
      requestAnimationFrame(() => focusHandle(index - 1))
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      moveItem(index, index + 1)
      requestAnimationFrame(() => focusHandle(index + 1))
    }
  }

  function focusHandle(index: number) {
    document.querySelector<HTMLButtonElement>(`[data-faq-handle="${index}"]`)?.focus()
  }

  function handleSaveOrder() {
    setSavingOrder(true)
    setStatus({ kind: "idle" })
    reorderCaseFaqs(items.map((i) => i.id)).then((result) => {
      setSavingOrder(false)
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error })
        return
      }
      setStatus({ kind: "success", message: "常見問題排序已儲存。" })
      router.refresh()
    })
  }

  function handleToggleVisibility(row: AdminFaqRow) {
    setPendingId(row.id)
    setStatus({ kind: "idle" })
    setCaseFaqVisibility(row.id, !row.is_visible).then((result) => {
      setPendingId(null)
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error })
        return
      }
      setStatus({
        kind: "success",
        message: row.is_visible ? "問題已隱藏。" : "問題已顯示。",
      })
      router.refresh()
    })
  }

  function handleDelete(row: AdminFaqRow) {
    const ok = window.confirm(`確定要刪除問題「${row.question}」嗎？此動作無法復原。`)
    if (!ok) return

    setPendingId(row.id)
    setStatus({ kind: "idle" })
    deleteCaseFaq(row.id).then((result) => {
      setPendingId(null)
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error })
        return
      }
      if (editorTarget === row.id) setEditorTarget(null)
      setStatus({ kind: "success", message: "問題已刪除。" })
      router.refresh()
    })
  }

  const editingRow =
    typeof editorTarget === "string" ? items.find((i) => i.id === editorTarget) ?? null : null

  return (
    <div className="flex flex-col gap-5">
      {/* Global status banner */}
      {status.kind === "success" ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      ) : null}
      {status.kind === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      ) : null}

      {/* Create / Edit editor panel */}
      {editorTarget === "create" ? (
        <FaqEditorCard
          key="create"
          title="新增問題"
          initialQuestion=""
          initialAnswer=""
          onCancel={() => setEditorTarget(null)}
          onSubmit={(fd) => createCaseFaq(fd)}
          onSuccess={() => {
            setEditorTarget(null)
            setStatus({ kind: "success", message: "問題已新增。" })
            router.refresh()
          }}
        />
      ) : null}

      {editingRow ? (
        <FaqEditorCard
          key={editingRow.id}
          title="修改問題"
          initialQuestion={editingRow.question}
          initialAnswer={editingRow.answer_html}
          onCancel={() => setEditorTarget(null)}
          onSubmit={(fd) => updateCaseFaq(editingRow.id, fd)}
          onSuccess={() => {
            setEditorTarget(null)
            setStatus({ kind: "success", message: "問題已修改。" })
            router.refresh()
          }}
        />
      ) : null}

      {/* Add button (hidden while an editor is open) */}
      {editorTarget === null ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setEditorTarget("create")
              setStatus({ kind: "idle" })
            }}
            className={cn(buttonVariants({ size: "default" }))}
          >
            <Plus className="size-4" />
            新增問題
          </button>
        </div>
      ) : null}

      {/* FAQ list */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">目前尚無常見問題，請點選「新增問題」建立第一筆。</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y rounded-lg border" role="list">
            {items.map((item, index) => {
              const isDragging = dragIndex === index
              const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
              const busy = pendingId === item.id
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  className={cn(
                    "flex items-center gap-3 bg-card p-4 transition-colors",
                    isDragging && "opacity-50",
                    isOver && "bg-accent",
                    !item.is_visible && "bg-muted/30",
                  )}
                >
                  <button
                    type="button"
                    data-faq-handle={index}
                    aria-label={`拖曳或使用上下方向鍵調整「${item.question}」的順序，目前第 ${index + 1} 項，共 ${items.length} 項`}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" aria-hidden />
                  </button>

                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium text-foreground">{item.question}</span>
                    <span
                      className={cn(
                        "text-xs",
                        item.is_visible ? "text-secondary" : "text-muted-foreground",
                      )}
                    >
                      {item.is_visible ? "顯示中" : "已隱藏"}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(item)}
                      disabled={busy}
                      title={item.is_visible ? "隱藏" : "顯示"}
                      aria-label={item.is_visible ? `隱藏「${item.question}」` : `顯示「${item.question}」`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : item.is_visible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTarget(item.id)
                        setStatus({ kind: "idle" })
                      }}
                      title="修改"
                      aria-label={`修改「${item.question}」`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={busy}
                      title="刪除"
                      aria-label={`刪除「${item.question}」`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={savingOrder || !isDirty}
              className={cn(buttonVariants({ size: "default" }))}
            >
              {savingOrder ? <Loader2 className="size-4 animate-spin" /> : null}
              儲存排序
            </button>
            {isDirty && !savingOrder ? (
              <button
                type="button"
                onClick={() => {
                  setItems(initial)
                  setStatus({ kind: "idle" })
                }}
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                還原
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">拖曳項目以調整順序</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Create/Edit form card. Reuses the STEP 8 RichTextEditor with NO caseId, so
 * inline image upload is intentionally disabled (there is no shared-content
 * storage location; we must not invent one — same behavior as the Case Intro
 * editor). Client-side pre-validation mirrors the server via isHtmlContentEmpty.
 */
function FaqEditorCard({
  title,
  initialQuestion,
  initialAnswer,
  onSubmit,
  onSuccess,
  onCancel,
}: {
  title: string
  initialQuestion: string
  initialAnswer: string
  onSubmit: (form: FormData) => Promise<{ ok: true } | { ok: false; error: string }>
  onSuccess: () => void
  onCancel: () => void
}) {
  const [question, setQuestion] = React.useState(initialQuestion)
  const [answerHtml, setAnswerHtml] = React.useState(initialAnswer)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (question.trim() === "") {
      setError("請輸入問題。")
      return
    }
    if (isHtmlContentEmpty(answerHtml)) {
      setError("請輸入答案內容。")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.set("question", question)
      fd.set("answer_html", answerHtml)
      const result = await onSubmit(fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSuccess()
    } catch (err) {
      console.error("[v0] save case faq failed", err)
      setError("儲存時發生非預期錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="關閉編輯"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="faq-question" className="text-sm font-medium text-foreground">
          問題
        </label>
        <input
          id="faq-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：驗屋需要多久？"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">答案</span>
        <RichTextEditor
          value={answerHtml}
          onChange={setAnswerHtml}
          ariaLabel="常見問題答案"
          minHeightClass="min-h-[16rem]"
        />
        <p className="text-xs text-muted-foreground">
          內文圖片上傳在此頁暫不開放；文字與 HTML 編輯不受影響。
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className={cn(buttonVariants({ size: "default" }))}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          儲存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          取消
        </button>
      </div>
    </form>
  )
}
