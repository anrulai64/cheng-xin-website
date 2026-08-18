"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ImageOff, Loader2, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { deleteCategory } from "./actions"

export type CategoryRow = {
  id: string
  name: string
  slug: string | null
  image_url: string | null
  caseCount: number
}

export function CategoryList({ categories }: { categories: CategoryRow[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          目前尚無分類。請點選「新增主選項」建立第一個分類。
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {categories.map((category) => (
        <CategoryRowItem key={category.id} category={category} />
      ))}
    </ul>
  )
}

function CategoryRowItem({ category }: { category: CategoryRow }) {
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
    <li className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {category.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image_url || "/placeholder.svg"}
              alt={`${category.name} 圖片`}
              className="size-full object-cover"
            />
          ) : (
            <ImageOff className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{category.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {category.slug ? `/${category.slug}` : "（未設定網址）"}
            <span className="mx-1.5">·</span>
            {category.caseCount} 筆案例
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/admin/cases/categories/${category.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="size-3.5" />
            編輯
          </Link>
          {!confirming ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirming(true)
              }}
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
            >
              <Trash2 className="size-3.5" />
              刪除
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
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
            </>
          )}
        </div>
      </div>

      {confirming && !error ? (
        <p className="text-xs text-muted-foreground">
          刪除後無法復原，確定要刪除「{category.name}」嗎？
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
    </li>
  )
}
