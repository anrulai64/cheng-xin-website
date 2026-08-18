"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Loader2,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { bulkDeleteCases, deleteCase, duplicateCase } from "./actions"

export type CaseRow = {
  id: string
  name: string
  case_code: string
  publish_start: string | null
  publish_end: string | null
  status: string
  specification_type: string
  categoryName: string
}

type StatusMeta = { label: string; className: string }

const STATUS_MAP: Record<string, StatusMeta> = {
  sale: { label: "銷售", className: "bg-primary/15 text-primary" },
  display: { label: "展示", className: "bg-secondary/15 text-secondary" },
  offline: { label: "下架", className: "bg-muted text-muted-foreground" },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function CaseListTable({
  rows,
  page,
  totalPages,
  total,
  query,
}: {
  rows: CaseRow[]
  page: number
  totalPages: number
  total: number
  query: string
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [message, setMessage] = React.useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [confirmingBulk, setConfirmingBulk] = React.useState(false)
  const [rowConfirmId, setRowConfirmId] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  // Clear selection whenever the underlying rows change (page / search change).
  const rowIdsKey = rows.map((r) => r.id).join(",")
  React.useEffect(() => {
    setSelected(new Set())
    setConfirmingBulk(false)
    setRowConfirmId(null)
  }, [rowIdsKey])

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggleAll() {
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDuplicate(id: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await duplicateCase(id)
      if (!result.ok) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setMessage({ type: "ok", text: "已建立複製案例，請至列表編輯後再上架。" })
      router.refresh()
    })
  }

  function handleDeleteRow(id: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await deleteCase(id)
      if (!result.ok) {
        setMessage({ type: "error", text: result.error })
        setRowConfirmId(null)
        return
      }
      setMessage({ type: "ok", text: "案例已刪除。" })
      setRowConfirmId(null)
      router.refresh()
    })
  }

  function handleBulkDelete() {
    setMessage(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await bulkDeleteCases(ids)
      if (!result.ok) {
        setMessage({ type: "error", text: result.error })
        setConfirmingBulk(false)
        router.refresh()
        return
      }
      setMessage({ type: "ok", text: `已刪除 ${result.deleted} 筆案例。` })
      setConfirmingBulk(false)
      setSelected(new Set())
      router.refresh()
    })
  }

  const selectedCount = selected.size

  function pageHref(target: number) {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    params.set("page", String(target))
    return `/admin/cases?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="print-hide flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/cases/new" className={cn(buttonVariants({ size: "sm" }))}>
            新增案例
          </Link>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              if (selectedCount === 0) {
                setMessage({ type: "error", text: "請先勾選要刪除的案例。" })
                return
              }
              setConfirmingBulk(true)
            }}
            disabled={pending}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
          >
            <Trash2 className="size-3.5" />
            刪除勾選的資料
            {selectedCount > 0 ? `（${selectedCount}）` : ""}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form method="get" action="/admin/cases" className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="搜尋案例名稱"
                aria-label="搜尋案例名稱"
                className="h-9 w-44 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              搜尋條件
            </button>
            {query ? (
              <Link
                href="/admin/cases"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <X className="size-3.5" />
                清除
              </Link>
            ) : null}
          </form>
          <button
            type="button"
            onClick={() => window.print()}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Printer className="size-3.5" />
            列印本頁
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {message ? (
        <div
          role="alert"
          className={cn(
            "print-hide flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            message.type === "ok"
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      {/* Bulk delete confirmation */}
      {confirmingBulk ? (
        <div
          role="alertdialog"
          className="print-hide flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-foreground">
            確定要刪除所勾選的 {selectedCount} 筆案例嗎？此動作無法復原。
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={pending}
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              確定刪除
            </button>
            <button
              type="button"
              onClick={() => setConfirmingBulk(false)}
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {/* Table (printable) */}
      <div className="print-area overflow-x-auto rounded-lg border">
        <h2 className="hidden px-4 pt-4 text-lg font-bold print:block">案例管理</h2>
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? "查無符合搜尋條件的案例。" : "目前尚無實績案例。"}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="print-hide w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="全選本頁"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </th>
                <th className="print-hide w-14 px-3 py-2.5 font-medium">複製</th>
                <th className="px-3 py-2.5 font-medium">案例名稱</th>
                <th className="px-3 py-2.5 font-medium">案例編號</th>
                <th className="px-3 py-2.5 font-medium">分類</th>
                <th className="px-3 py-2.5 font-medium">上架日期</th>
                <th className="px-3 py-2.5 font-medium">下架日期</th>
                <th className="px-3 py-2.5 font-medium">狀態</th>
                <th className="px-3 py-2.5 font-medium">規格</th>
                <th className="print-hide w-16 px-3 py-2.5 font-medium">修改</th>
                <th className="print-hide w-20 px-3 py-2.5 font-medium">刪除</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="print-hide px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`選取 ${row.name}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="print-hide px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(row.id)}
                      disabled={pending}
                      title="複製案例"
                      aria-label={`複製 ${row.name}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")}
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5">
                    <span className="block truncate font-medium text-foreground" title={row.name}>
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                    {row.case_code}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.categoryName}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.publish_start)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.publish_end)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.specification_type}</td>
                  <td className="print-hide px-3 py-2.5">
                    <Link
                      href={`/admin/cases/${row.id}/edit`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Pencil className="size-3.5" />
                      修改
                    </Link>
                  </td>
                  <td className="print-hide px-3 py-2.5">
                    {rowConfirmId === row.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={pending}
                          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                        >
                          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                          確定
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowConfirmId(null)}
                          disabled={pending}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null)
                          setRowConfirmId(row.id)
                        }}
                        className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                      >
                        <Trash2 className="size-3.5" />
                        刪除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="print-hide flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          共 {total} 筆，第 {page} / {totalPages} 頁
        </p>
        <nav className="flex items-center gap-1" aria-label="分頁">
          <PageLink href={pageHref(1)} disabled={page <= 1} label="第一頁">
            <ChevronsLeft className="size-4" />
          </PageLink>
          <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="上一頁">
            <ChevronLeft className="size-4" />
          </PageLink>
          <PageLink href={pageHref(page + 1)} disabled={page >= totalPages} label="下一頁">
            <ChevronRight className="size-4" />
          </PageLink>
          <PageLink href={pageHref(totalPages)} disabled={page >= totalPages} label="最終頁">
            <ChevronsRight className="size-4" />
          </PageLink>
        </nav>
      </div>
    </div>
  )
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 cursor-not-allowed opacity-40",
        )}
      >
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8")}
    >
      {children}
    </Link>
  )
}
