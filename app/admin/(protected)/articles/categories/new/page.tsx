import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { requireAdmin } from "@/lib/admin/auth"
import { CategoryForm } from "../category-form"

export const dynamic = "force-dynamic"

export default async function NewArticleCategoryPage() {
  await requireAdmin()

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
        <h1 className="font-heading text-2xl font-bold text-foreground">新增文章分類</h1>
      </div>

      <CategoryForm mode="create" />
    </div>
  )
}
