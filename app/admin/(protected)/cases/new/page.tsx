import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { CaseForm, type CategoryOption } from "../case-form"
import type { CandidateCase } from "../related-case-selector"

export const dynamic = "force-dynamic"

export default async function NewCasePage() {
  await requireAdmin()
  const supabase = await createClient()

  // Load category options from live data (no hard-coding).
  const { data: categories } = await supabase
    .from("case_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const options: CategoryOption[] = (categories ?? []).map((c) => ({ id: c.id, name: c.name }))

  // Load candidate cases for the 相關案例 picker. Only lightweight identifying
  // fields — never description_html / detail_html. No self-exclusion needed
  // because the new case does not exist yet. Ordering mirrors the edit-page
  // related-case selector (sort_order ASC, created_at ASC).
  const { data: candidateRows } = await supabase
    .from("case_items")
    .select("id, name, case_code, category_id, status")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const categoryNameById = new Map<string, string>(
    (categories ?? []).map((c) => [c.id, c.name]),
  )

  const relatedCandidates: CandidateCase[] = (candidateRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    case_code: c.case_code,
    category_name: c.category_id ? categoryNameById.get(c.category_id) ?? null : null,
    status: c.status,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回案例管理
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">新增案例</h1>
      </div>

      <CaseForm mode="create" categories={options} relatedCandidates={relatedCandidates} />
    </div>
  )
}
