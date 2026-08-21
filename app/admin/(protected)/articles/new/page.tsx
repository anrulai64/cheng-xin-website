import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { ArticleForm, type ArticleCategoryOption } from "../article-form"

export const dynamic = "force-dynamic"

export default async function NewArticlePage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: categoryRows, error } = await supabase
    .from("article_categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const categories: ArticleCategoryOption[] = (categoryRows ?? []).map((c) => ({ id: c.id, name: c.name }))

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
        <h1 className="font-heading text-2xl font-bold text-foreground">新增文章</h1>
      </div>

      {error ? (
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
        <ArticleForm mode="create" categories={categories} />
      )}
    </div>
  )
}
