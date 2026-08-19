import { createClient } from "@/lib/supabase/server"
import { CategorySelect, type CategoryOption } from "./category-select"
import { CaseSortList, type SortCaseRow } from "./case-sort-list"

export const dynamic = "force-dynamic"

export default async function CaseSortPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createClient()

  // Load categories (never hard-coded): sort_order ASC, then created_at ASC.
  const { data: categoryRows } = await supabase
    .from("case_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const categories: CategoryOption[] = (categoryRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  // Only treat the URL category as selected if it still exists.
  const selectedId =
    category && categories.some((c) => c.id === category) ? category : null

  // Load cases for the selected category only. Fetch only sorting-relevant
  // fields — never description_html / detail_html / images / related cases.
  let cases: SortCaseRow[] = []
  if (selectedId) {
    const { data: caseRows } = await supabase
      .from("case_items")
      .select("id, name, case_code, status")
      .eq("category_id", selectedId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    cases = (caseRows ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      case_code: c.case_code,
      status: c.status,
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">案例排序</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          選擇分類後，可透過拖曳調整該分類中案例的顯示順序。
        </p>
      </div>

      <CategorySelect categories={categories} selectedId={selectedId} />

      {!selectedId ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">請先選擇分類。</p>
        </div>
      ) : (
        <CaseSortList key={selectedId} categoryId={selectedId} initial={cases} />
      )}
    </div>
  )
}
