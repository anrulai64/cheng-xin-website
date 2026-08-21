import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { ArticleList, type ArticleListRow } from "./article-list"

export const dynamic = "force-dynamic"

export default async function ArticlesPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Ordered by publish_date DESC, then created_at DESC (stable tiebreaker).
  // publish_date is NOT the visibility gate — it is editorial metadata used
  // only for list ordering/display here. NULLs (if any) are explicitly
  // pushed to the end rather than left to an implicit default.
  const { data: articleRows, error: articlesError } = await supabase
    .from("articles")
    .select(
      "id, title, slug, status, category_id, publish_date, start_date, end_date, seo_title, seo_description, created_at, updated_at",
    )
    .order("publish_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  let categoryNameById = new Map<string, string>()
  let categoriesError = false

  if (!articlesError && articleRows && articleRows.length > 0) {
    // Two-query approach: keeps the generated Article/Category row types
    // exact, with no nested-relation typing workaround needed.
    const categoryIds = Array.from(new Set(articleRows.map((a) => a.category_id)))
    const { data: categoryRows, error: catError } = await supabase
      .from("article_categories")
      .select("id, name")
      .in("id", categoryIds)

    if (catError) {
      categoriesError = true
    } else {
      categoryNameById = new Map((categoryRows ?? []).map((c) => [c.id, c.name]))
    }
  }

  const hasError = Boolean(articlesError) || categoriesError

  const rows: ArticleListRow[] = (articleRows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    status: a.status,
    categoryName: categoryNameById.get(a.category_id) ?? "分類資料異常",
    publish_date: a.publish_date,
    start_date: a.start_date,
    end_date: a.end_date,
    seo_title: a.seo_title,
    seo_description: a.seo_description,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">文章管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理網站文章內容、發布狀態與 SEO 設定。</p>
        </div>
        <Link href="/admin/articles/new" className={cn(buttonVariants({ size: "default" }))}>
          新增文章
        </Link>
      </div>

      {hasError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          讀取文章資料時發生錯誤，請稍後再試。
        </div>
      ) : (
        <ArticleList rows={rows} />
      )}
    </div>
  )
}
