import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { CategoryForm } from "../category-form"

export const dynamic = "force-dynamic"

export default function NewCategoryPage() {
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
        <h1 className="font-heading text-2xl font-bold text-foreground">新增主選項</h1>
      </div>

      <CategoryForm mode="create" />
    </div>
  )
}
