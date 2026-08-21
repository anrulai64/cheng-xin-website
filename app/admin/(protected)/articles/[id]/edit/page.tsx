import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { ArticleForm, type ArticleCategoryOption, type ArticleInitialValues } from "../../article-form"

export const dynamic = "force-dynamic"

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  // A malformed (non-UUID) id causes Postgres to return an error here, which
  // is treated the same as "not found" — matching the Article/Case Category
  // edit convention.
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select(
      "id, title, category_id, slug, status, publish_date, start_date, end_date, excerpt, seo_title, seo_keywords, seo_description",
    )
    .eq("id", id)
    .single()

  if (articleError || !article) {
    notFound()
  }

  const { data: categoryRows, error: categoriesError } = await supabase
    .from("article_categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const categories: ArticleCategoryOption[] = (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name }))

  const initialValues: ArticleInitialValues = {
    id: article.id,
    title: article.title,
    category_id: article.category_id,
    slug: article.slug,
    status: article.status,
    publish_date: article.publish_date,
    start_date: article.start_date,
    end_date: article.end_date,
    excerpt: article.excerpt,
    seo_title: article.seo_title,
    seo_keywords: article.seo_keywords,
    seo_description: article.seo_description,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回文章管理
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">編輯文章</h1>
      </div>

      {categoriesError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          讀取文章分類時發生錯誤，請稍後再試。
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-6 py-12">
          <p className="text-sm text-muted-foreground">目前沒有可用的文章分類，請先建立文章分類。</p>
          <Link href="/admin/articles/categories" className={cn(buttonVariants({ size: "default" }))}>
            前往文章分類管理
          </Link>
        </div>
      ) : (
        <ArticleForm mode="edit" categories={categories} initialValues={initialValues} />
      )}
    </div>
  )
}
