"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { deleteCategory } from "./actions"

export type ArticleCategoryRow = {
  id: string
  name: string
  slug: string
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  created_at: string
  updated_at: string
}

// Simple deterministic SEO status: only seo_title + seo_description are
// required. seo_keywords is optional and never affects the result.
function SeoStatusBadge({ category }: { category: ArticleCategoryRow }) {
  const complete = Boolean(category.seo_title?.trim()) && Boolean(category.seo_description?.trim())

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

export function CategoryList({ categories }: { categories: ArticleCategoryRow[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">尚未建立文章分類。</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">分類名稱</th>
            <th className="px-3 py-2.5 font-medium">Slug</th>
            <th className="px-3 py-2.5 font-medium">排序</th>
            <th className="px-3 py-2.5 font-medium">SEO 狀態</th>
            <th className="w-16 px-3 py-2.5 font-medium">修改</th>
            <th className="px-3 py-2.5 font-medium">刪除</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoryRow({ category }: { category: ArticleCategoryRow }) {
  const router = useRouter()
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteCategory(category.id)
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
        <td className="max-w-[220px] px-3 py-2.5">
          <span className="block truncate font-medium text-foreground" title={category.name}>
            {category.name}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="text-muted-foreground">
            /blog/category/<span className="font-mono text-xs text-foreground">{category.slug}</span>
          </span>
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{category.sort_order}</td>
        <td className="px-3 py-2.5">
          <SeoStatusBadge category={category} />
        </td>
        <td className="px-3 py-2.5">
          <Link
            href={`/admin/articles/categories/${category.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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
              aria-label={`刪除分類「${category.name}」`}
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
                aria-label={`確定刪除分類「${category.name}」`}
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
          <td colSpan={6} className="px-3 pb-3">
            {confirming && !error ? (
              <p className="text-xs text-muted-foreground">
                確定要刪除「{category.name}」嗎？刪除後無法復原。
              </p>
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
