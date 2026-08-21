import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { CaseListTable, type CaseRow } from "./case-list-table"

const PAGE_SIZE = 10

export const dynamic = "force-dynamic"

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const supabase = await createClient()

  const sp = await searchParams
  const query = (sp.q ?? "").trim()
  const requestedPage = Number.parseInt(sp.page ?? "1", 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let listQuery = supabase
    .from("case_items")
    .select(
      "id, name, case_code, publish_start, publish_end, status, specification_type, category_id",
      { count: "exact" },
    )
  if (query) {
    listQuery = listQuery.ilike("name", `%${query}%`)
  }
  // Admin management ordering is intentionally separate from public display
  // ordering (which uses category-scoped sort_order). Newest first so a newly
  // created or duplicated case is immediately visible at the top of the list,
  // regardless of its sort_order. Does NOT affect /admin/cases/sort or any
  // public query — both continue to use sort_order.
  listQuery = listQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to)

  const { data, count, error } = await listQuery

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          載入案例資料時發生錯誤：{error.message}
        </div>
      </div>
    )
  }

  const items = data ?? []

  // Resolve category names via a scoped second query (the FK is not declared in
  // the generated types, so we avoid a fragile PostgREST embed).
  const categoryIds = [...new Set(items.map((r) => r.category_id).filter(Boolean))]
  const categoryMap = new Map<string, string>()
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("case_categories")
      .select("id, name")
      .in("id", categoryIds)
    for (const c of cats ?? []) categoryMap.set(c.id, c.name)
  }

  const rows: CaseRow[] = items.map((r) => ({
    id: r.id,
    name: r.name,
    case_code: r.case_code,
    publish_start: r.publish_start,
    publish_end: r.publish_end,
    status: r.status,
    specification_type: r.specification_type,
    categoryName: categoryMap.get(r.category_id) ?? "—",
  }))

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <CaseListTable
        rows={rows}
        page={page}
        totalPages={totalPages}
        total={total}
        query={query}
      />
    </div>
  )
}

function PageHeader() {
  return (
    <div className="print-hide">
      <h1 className="font-heading text-2xl font-bold text-foreground">案例管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        管理所有實績案例，可搜尋、新增、複製、刪除與批次管理。
      </p>
    </div>
  )
}
