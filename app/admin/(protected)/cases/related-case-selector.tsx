"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"

export type CandidateCase = {
  id: string
  name: string
  case_code: string
  category_name: string | null
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  sale: "銷售中",
  display: "僅展示",
  offline: "已下架",
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

/**
 * Controlled, presentational related-case selector used by the CREATE form.
 *
 * Unlike the edit-page RelatedCaseManager (which persists immediately via its
 * own 儲存 button), this component performs NO writes. It simply reports the
 * selected ids to its parent through `onChange`, so the selection can be
 * submitted together with the new case in a single create action.
 */
export function RelatedCaseSelector({
  candidates,
  selected,
  onChange,
}: {
  candidates: CandidateCase[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = React.useState("")

  const selectedSet = React.useMemo(() => new Set(selected), [selected])

  const byId = React.useMemo(() => {
    const m = new Map<string, CandidateCase>()
    for (const c of candidates) m.set(c.id, c)
    return m
  }, [candidates])

  // Search filter — matches 案例名稱 or 案例編號 only (case-insensitive).
  // Never touches description_html / detail_html.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) => c.name.toLowerCase().includes(q) || c.case_code.toLowerCase().includes(q),
    )
  }, [candidates, query])

  const selectedList = React.useMemo(
    () => selected.map((id) => byId.get(id)).filter((c): c is CandidateCase => Boolean(c)),
    [selected, byId],
  )

  function toggle(id: string) {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id))
  }

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">目前沒有其他案例可供選擇。</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="related-create-search" className="text-sm font-medium text-foreground">
          搜尋案例
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="related-create-search"
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
          <p className="text-sm font-medium text-foreground">可選案例（{filtered.length}）</p>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">找不到符合的案例。</p>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => {
                  const checked = selectedSet.has(c.id)
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
              <p className="p-4 text-sm text-muted-foreground">目前尚未選擇相關案例。</p>
            ) : (
              <ul className="divide-y">
                {selectedList.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 p-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
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
    </div>
  )
}
