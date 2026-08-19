import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { CaseForm, type CategoryOption, type CaseValues } from "../../case-form"
import { CaseImageManager, type CaseImageRow } from "./case-image-manager"
import { RelatedCaseManager, type CandidateCase } from "./related-case-manager"

export const dynamic = "force-dynamic"

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  const { data: caseItem, error } = await supabase
    .from("case_items")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !caseItem) {
    notFound()
  }

  const { data: categories } = await supabase
    .from("case_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const options: CategoryOption[] = (categories ?? []).map((c) => ({ id: c.id, name: c.name }))

  // Load only THIS case's images, ordered for display.
  const { data: imageRows } = await supabase
    .from("case_images")
    .select("id, storage_path, public_url, alt_text, sort_order")
    .eq("case_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const images: CaseImageRow[] = (imageRows ?? []).map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
    public_url: img.public_url,
    alt_text: img.alt_text,
    sort_order: img.sort_order,
  }))

  // ---- 相關案例: candidate cases (exclude self) + current relationships ----
  // Fetch only the lightweight fields needed for identification in the picker;
  // never load description_html / detail_html.
  const { data: candidateRows } = await supabase
    .from("case_items")
    .select("id, name, case_code, category_id, status")
    .neq("id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  // Resolve category names via a scoped lookup (FK isn't in generated types).
  const categoryNameById = new Map<string, string>(
    (categories ?? []).map((c) => [c.id, c.name]),
  )

  const candidates: CandidateCase[] = (candidateRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    case_code: c.case_code,
    category_name: c.category_id ? categoryNameById.get(c.category_id) ?? null : null,
    status: c.status,
  }))

  const { data: relatedRows } = await supabase
    .from("case_related_cases")
    .select("related_case_id, sort_order, created_at")
    .eq("case_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  // Keep only relationships whose target still exists among candidates, so a
  // stale row can never break the picker.
  const candidateIdSet = new Set(candidates.map((c) => c.id))
  const initialSelectedIds: string[] = (relatedRows ?? [])
    .map((r) => r.related_case_id)
    .filter((rid) => candidateIdSet.has(rid))

  const values: CaseValues = {
    id: caseItem.id,
    category_id: caseItem.category_id,
    name: caseItem.name,
    short_description: caseItem.short_description,
    seo_title: caseItem.seo_title,
    seo_keywords: caseItem.seo_keywords,
    seo_description: caseItem.seo_description,
    head_code: caseItem.head_code,
    slug: caseItem.slug,
    price: caseItem.price,
    original_price: caseItem.original_price,
    is_home: caseItem.is_home,
    is_new: caseItem.is_new,
    is_hot: caseItem.is_hot,
    is_recommended: caseItem.is_recommended,
    publish_start: caseItem.publish_start,
    publish_end: caseItem.publish_end,
    status: caseItem.status,
    description_html: caseItem.description_html,
    detail_html: caseItem.detail_html,
    note: caseItem.note,
    specification_type: caseItem.specification_type,
    specification_description: caseItem.specification_description,
    case_code: caseItem.case_code,
    stock_quantity: caseItem.stock_quantity,
    safety_stock: caseItem.safety_stock,
    shipping_rule: caseItem.shipping_rule,
  }

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
        <h1 className="font-heading text-2xl font-bold text-foreground">編輯案例</h1>
      </div>

      <CaseForm mode="edit" categories={options} caseItem={values} />

      <CaseImageManager caseId={caseItem.id} initialImages={images} />

      <RelatedCaseManager
        currentId={caseItem.id}
        candidates={candidates}
        initialSelectedIds={initialSelectedIds}
      />
    </div>
  )
}
