"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { deleteArticle } from "./actions"

export type ArticleListRow = {
  id: string
  title: string
  slug: string
  status: string
  categoryName: string
  publish_date: string | null
  start_date: string | null
  end_date: string | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  published: "已發布",
  offline: "已下架",
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? "狀態未知"
  const tone =
    status === "published"
      ? "bg-primary/15 text-primary"
      : status === "offline"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  )
}

// Same V1 completeness rule used for Article Categories: only seo_title and
// seo_description are required; seo_keywords never affects this status.
function SeoStatusBadge({ row }: { row: ArticleListRow }) {
  const complete = Boolean(row.seo_title?.trim()) && Boolean(row.seo_description?.trim())

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        complete ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {complete ? "SEO 已設定" : "SEO 未完整"}
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return value
}

// Display-only summary of start_date/end_date. publish_date is intentionally
// excluded — it is editorial metadata, not the scheduling gate.
function ScheduleSummary({ row }: { row: ArticleListRow }) {
  const { start_date, end_date } = row

  if (!start_date && !end_date) {
    return <span className="text-muted-foreground">無排程</span>
  }
  if (start_date && !end_date) {
    return <span>自 {start_date} 起</span>
  }
  if (!start_date && end_date) {
    return <span>至 {end_date}</span>
  }
  return (
    <span>
      {start_date} ～ {end_date}
    </span>
  )
}

export function ArticleList({ rows }: { rows: ArticleListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">尚未建立文章。</p>
        <p className="mt-1 text-sm text-muted-foreground">文章編輯功能將於後續版本開放後即可建立文章。</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1040px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">文章標題</th>
            <th className="px-3 py-2.5 font-medium">分類</th>
            <th className="px-3 py-2.5 font-medium">Slug</th>
            <th className="px-3 py-2.5 font-medium">狀態</th>
            <th className="px-3 py-2.5 font-medium">發布日期</th>
            <th className="px-3 py-2.5 font-medium">排程</th>
            <th className="px-3 py-2.5 font-medium">SEO 狀態</th>
            <th className="w-16 px-3 py-2.5 font-medium">修改</th>
            <th className="px-3 py-2.5 font-medium">刪除</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ArticleRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ArticleRow({ row }: { row: ArticleListRow }) {
  const router = useRouter()
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteArticle(row.id)
      if (!result.ok) {
        setError(result.error)
        setConfirming(false)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="max-w-[260px] px-3 py-2.5">
          <span className="block truncate font-medium text-foreground" title={row.title}>
            {row.title}
          </span>
        </td>
        <td className="max-w-[160px] px-3 py-2.5">
          <span className="block truncate text-muted-foreground" title={row.categoryName}>
            {row.categoryName}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="text-muted-foreground">
            /blog/<span className="font-mono text-xs text-foreground">{row.slug}</span>
          </span>
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge status={row.status} />
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.publish_date)}</td>
        <td className="px-3 py-2.5 text-muted-foreground">
          <ScheduleSummary row={row} />
        </td>
        <td className="px-3 py-2.5">
          <SeoStatusBadge row={row} />
        </td>
        <td className="px-3 py-2.5">
          <Link
            href={`/admin/articles/${row.id}/edit`}
            aria-disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), pending && "pointer-events-none opacity-50")}
          >
            <Pencil className="size-3.5" />
            修改
          </Link>
        </td>
        <td className="px-3 py-2.5">
          {!confirming ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirming(true)
              }}
              disabled={pending}
              aria-label={`刪除文章「${row.title}」`}
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            >
              <Trash2 className="size-3.5" />
              刪除
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                aria-label={`確定刪除文章「${row.title}」`}
                className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                確定刪除
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                取消
              </button>
            </div>
          )}
        </td>
      </tr>

      {confirming || error ? (
        <tr className="border-b last:border-0">
          <td colSpan={9} className="px-3 pb-3">
            {confirming && !error ? (
              <p className="text-xs text-muted-foreground">確定要刪除「{row.title}」嗎？刪除後無法復原。</p>
            ) : null}
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  )
}
