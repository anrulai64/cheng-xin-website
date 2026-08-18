import Link from "next/link"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { CategoryList, type CategoryRow } from "./category-list"
import { CategoryTabs } from "./category-tabs"

export const dynamic = "force-dynamic"

async function loadCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient()

  // Ordered by sort_order ASC, then created_at ASC (stable legacy ordering).
  const { data: categories, error } = await supabase
    .from("case_categories")
    .select("id, name, slug, image_url")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !categories) {
    console.error("[v0] failed to load case_categories", error?.message)
    return []
  }

  // Tally case counts per category with a single lightweight query.
  const { data: items } = await supabase.from("case_items").select("category_id")
  const counts = new Map<string, number>()
  for (const item of items ?? []) {
    counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1)
  }

  return categories.map((c) => ({
    ...c,
    caseCount: counts.get(c.id) ?? 0,
  }))
}

export default async function CaseCategoriesPage() {
  const categories = await loadCategories()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">分類管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理實績案例分類。</p>
      </div>

      <CategoryTabs active="manage" />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">選擇項目</p>
        <Link
          href="/admin/cases/categories/new"
          className={cn(buttonVariants({ size: "default" }))}
        >
          <Plus className="size-4" />
          新增主選項
        </Link>
      </div>

      <CategoryList categories={categories} />
    </div>
  )
}
