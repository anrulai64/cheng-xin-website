import { createClient } from "@/lib/supabase/server"
import { CategoryTabs } from "../category-tabs"
import { CategorySortList, type SortCategoryRow } from "./category-sort-list"

export const dynamic = "force-dynamic"

async function loadCategories(): Promise<SortCategoryRow[]> {
  const supabase = await createClient()

  // Same ordering as 分類管理: sort_order ASC, then created_at ASC.
  const { data, error } = await supabase
    .from("case_categories")
    .select("id, name, image_url")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !data) {
    console.error("[v0] failed to load case_categories for sorting", error?.message)
    return []
  }

  return data
}

export default async function CaseCategoriesSortPage() {
  const categories = await loadCategories()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">分類排序</h1>
        <p className="mt-1 text-sm text-muted-foreground">調整案例分類在前台的顯示順序。</p>
      </div>

      <CategoryTabs active="sort" />

      <CategorySortList initial={categories} />
    </div>
  )
}
