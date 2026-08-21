import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { CategoryForm } from "../../category-form"

export const dynamic = "force-dynamic"

export default async function EditArticleCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  // A malformed (non-UUID) id causes Postgres to return an error here, which
  // is treated the same as "not found" — matching the Case CMS convention.
  const { data: category, error } = await supabase
    .from("article_categories")
    .select("id, name, slug, seo_title, seo_keywords, seo_description")
    .eq("id", id)
    .single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/articles/categories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回文章分類
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">編輯文章分類</h1>
      </div>

      <CategoryForm mode="edit" category={category} />
    </div>
  )
}
