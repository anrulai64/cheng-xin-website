"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveRelatedCases } from "./related-actions"

export type CandidateCase = {
  id: string
  name: string
  case_code: string
  category_name: string | null
  status: string
}

type Feedback =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }

const STATUS_LABELS: Record<string, string> = {
  sale: "銷售中",
  display: "僅展示",
  offline: "已下架",
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function RelatedCaseManager({
  currentId,
  candidates,
  initialSelectedIds,
}: {
  currentId: string
  candidates: CandidateCase[]
  initialSelectedIds: string[]
}) {
  const router = useRouter()

  // Selection state (Set of related case ids), seeded from saved relationships.
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(initialSelectedIds),
  )
  const [query, setQuery] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [feedback, setFeedback] = React.useState<Feedback>({ kind: "idle" })

  // Re-seed when server data changes (after a save + refresh).
  React.useEffect(() => {
    setSelected(new Set(initialSelectedIds))
  }, [initialSelectedIds])

  const byId = React.useMemo(() => {
    const m = new Map<string, CandidateCase>()
    for (const c of candidates) m.set(c.id, c)
    return m
  }, [candidates])

  // Search filter — matches 案例名稱 or 案例編號 (case-insensitive). Never
  // touches description_html / detail_html.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.case_code.toLowerCase().includes(q),
    )
  }, [candidates, query])

  const selectedList = React.useMemo(
    () => [...selected].map((id) => byId.get(id)).filter((c): c is CandidateCase => Boolean(c)),
    [selected, byId],
  )

  // Dirty check against the saved baseline.
  const dirty = React.useMemo(() => {
    if (selected.size !== initialSelectedIds.length) return true
    for (const id of initialSelectedIds) if (!selected.has(id)) return true
    return false
  }, [selected, initialSelectedIds])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFeedback({ kind: "idle" })
  }

  function remove(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setFeedback({ kind: "idle" })
  }

  async function handleSave() {
    setSaving(true)
    setFeedback({ kind: "idle" })
    const result = await saveRelatedCases(currentId, [...selected])
    setSaving(false)

    if (result.ok) {
      setFeedback({ kind: "success", message: "相關案例已儲存。" })
      router.refresh()
    } else {
      setFeedback({ kind: "error", message: result.error })
    }
  }

  // No other cases exist at all.
  if (candidates.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">相關案例</h2>
        <p className="mt-3 text-sm text-muted-foreground">目前沒有其他案例可供選擇。</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-bold text-foreground">相關案例</h2>
        <p className="text-sm text-muted-foreground">
          為此案例挑選相關案例。此設定為單向：僅影響目前案例所顯示的相關案例。
        </p>
      </div>

      {feedback.kind !== "idle" ? (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            feedback.kind === "success"
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="related-search" className="text-sm font-medium text-foreground">
          搜尋案例
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="related-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="輸入案例名稱或案例編號"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Candidate list */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            可選案例（{filtered.length}）
          </p>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">找不到符合的案例。</p>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => {
                  const checked = selected.has(c.id)
                  return (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(c.id)}
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {c.name}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span>編號：{c.case_code}</span>
                            {c.category_name ? <span>· {c.category_name}</span> : null}
                            <span>· {statusLabel(c.status)}</span>
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Selected list */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            已選擇相關案例（{selectedList.length}）
          </p>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            {selectedList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">目前尚未設定相關案例。</p>
            ) : (
              <ul className="divide-y">
                {selectedList.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 p-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>編號：{c.case_code}</span>
                        {c.category_name ? <span>· {c.category_name}</span> : null}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`移除相關案例：${c.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(buttonVariants(), "gap-2")}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          儲存相關案例
        </button>
        {dirty ? (
          <span className="text-xs text-muted-foreground">尚有未儲存的變更。</span>
        ) : null}
      </div>
    </section>
  )
}
