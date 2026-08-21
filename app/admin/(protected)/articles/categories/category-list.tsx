import { Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

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
            <th className="w-16 px-3 py-2.5 font-medium">刪除</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
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
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="編輯功能將於後續版本提供"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Pencil className="size-3.5" />
                  修改
                </button>
              </td>
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="刪除功能將於後續版本提供"
                  className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                >
                  <Trash2 className="size-3.5" />
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
