import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { CategoryForm } from "../../category-form"

export const dynamic = "force-dynamic"

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category, error } = await supabase
    .from("case_categories")
    .select("id, name, seo_title, seo_keywords, seo_description, head_code, slug, image_url")
    .eq("id", id)
    .single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/cases/categories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回分類管理
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">編輯分類</h1>
      </div>

      <CategoryForm mode="edit" category={category} />
    </div>
  )
}
