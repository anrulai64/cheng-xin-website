"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, GripVertical, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { reorderCasesInCategory } from "./actions"

export type SortCaseRow = {
  id: string
  name: string
  case_code: string | null
  status: string
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  sale: { label: "銷售", className: "bg-primary/15 text-primary" },
  display: { label: "展示", className: "bg-secondary/15 text-secondary" },
  offline: { label: "下架", className: "bg-muted text-muted-foreground" },
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

export function CaseSortList({
  categoryId,
  initial,
}: {
  categoryId: string
  initial: SortCaseRow[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState<SortCaseRow[]>(initial)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [overIndex, setOverIndex] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<Status>({ kind: "idle" })

  // Re-sync when the server data changes (e.g. category switch or refresh).
  React.useEffect(() => {
    setItems(initial)
    setStatus({ kind: "idle" })
  }, [initial])

  // Detect whether the current order differs from the initial (server) order.
  const isDirty = React.useMemo(
    () => items.some((item, i) => item.id !== initial[i]?.id),
    [items, initial],
  )

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setStatus({ kind: "idle" })
  }

  // --- Native HTML Drag and Drop (mouse / touch via pointer) ---
  function handleDragStart(index: number) {
    setDragIndex(index)
    setStatus({ kind: "idle" })
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault() // allow drop
    if (index !== overIndex) setOverIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex !== null) move(dragIndex, index)
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  // --- Keyboard reordering (accessibility): ArrowUp / ArrowDown on handle ---
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
    const el = document.querySelector<HTMLButtonElement>(`[data-sort-handle="${index}"]`)
    el?.focus()
  }

  function handleSave() {
    setStatus({ kind: "saving" })
    const orderedIds = items.map((i) => i.id)
    reorderCasesInCategory(categoryId, orderedIds).then((result) => {
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error })
        return
      }
      setStatus({ kind: "success", message: "案例排序已儲存。" })
      // Refresh so the server order becomes the new baseline (reload-verified).
      router.refresh()
    })
  }

  function handleReset() {
    setItems(initial)
    setStatus({ kind: "idle" })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">此分類目前尚無案例。</p>
      </div>
    )
  }

  const saving = status.kind === "saving"

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">請直接拖曳調整以下排序的順序後按儲存</p>

      <ul className="flex flex-col divide-y rounded-lg border" role="list">
        {items.map((item, index) => {
          const isDragging = dragIndex === index
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
          const statusMeta = STATUS_LABELS[item.status] ?? {
            label: item.status,
            className: "bg-muted text-muted-foreground",
          }
          return (
            <li
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 bg-card p-4 transition-colors",
                isDragging && "opacity-50",
                isOver && "bg-accent",
              )}
            >
              <button
                type="button"
                data-sort-handle={index}
                aria-label={`拖曳或使用上下方向鍵調整「${item.name}」的順序，目前第 ${index + 1} 項，共 ${items.length} 項`}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              >
                <GripVertical className="size-4" aria-hidden />
              </button>

              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                {index + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">{item.name}</span>
                {item.case_code ? (
                  <span className="truncate text-xs text-muted-foreground">
                    編號：{item.case_code}
                  </span>
                ) : null}
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  statusMeta.className,
                )}
              >
                {statusMeta.label}
              </span>
            </li>
          )
        })}
      </ul>

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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={cn(buttonVariants({ size: "default" }))}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          儲存排序
        </button>
        {isDirty && !saving ? (
          <button
            type="button"
            onClick={handleReset}
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            還原
          </button>
        ) : null}
        {!isDirty && status.kind !== "success" ? (
          <span className="text-xs text-muted-foreground">拖曳項目以調整順序</span>
        ) : null}
      </div>
    </div>
  )
}
