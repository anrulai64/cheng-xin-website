import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { FaqManager, type AdminFaqRow } from "./faq-manager"

export const dynamic = "force-dynamic"

export default async function CasesFaqPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Admins see ALL rows (visible + hidden), ordered exactly as the public list
  // will render (sort_order ASC, created_at ASC).
  const { data, error } = await supabase
    .from("case_faqs")
    .select("id, question, answer_html, sort_order, is_visible")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  const rows: AdminFaqRow[] = (data ?? []).map((r) => ({
    id: r.id,
    question: r.question,
    answer_html: r.answer_html,
    sort_order: r.sort_order,
    is_visible: r.is_visible,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">常見問題</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理前台案例區塊「常見問題」分頁的內容。此為全站案例共用，並非附屬於單一案例。
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          讀取常見問題資料時發生錯誤：{error.message}
        </div>
      ) : (
        <FaqManager initial={rows} />
      )}
    </div>
  )
}
