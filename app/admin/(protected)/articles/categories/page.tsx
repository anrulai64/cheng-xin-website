import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { CategoryList, type ArticleCategoryRow } from "./category-list"

export const dynamic = "force-dynamic"

export default async function ArticleCategoriesPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Ordered by sort_order ASC, then created_at ASC (stable), matching the
  // Case CMS category-list convention.
  const { data, error } = await supabase
    .from("article_categories")
    .select("id, name, slug, sort_order, seo_title, seo_description, seo_keywords, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const rows: ArticleCategoryRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sort_order: c.sort_order,
    seo_title: c.seo_title,
    seo_description: c.seo_description,
    seo_keywords: c.seo_keywords,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">文章分類</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理部落格文章的分類。</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          讀取文章分類資料時發生錯誤：{error.message}
        </div>
      ) : (
        <CategoryList categories={rows} />
      )}
    </div>
  )
}
