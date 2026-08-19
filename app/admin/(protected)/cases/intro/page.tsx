import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin/auth"
import { IntroEditor } from "./intro-editor"

export const dynamic = "force-dynamic"

export default async function CasesIntroPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Load the singleton (the one visible row). maybeSingle() tolerates the
  // "no row yet" case; the partial unique index guarantees at most one.
  const { data: intro } = await supabase
    .from("case_intro_content")
    .select("content_html")
    .eq("is_visible", true)
    .maybeSingle()

  const initialHtml = intro?.content_html ?? ""

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">案例介紹文字</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理前台案例區塊的共用介紹／常見問題內容。此內容為全站共用，並非附屬於單一案例。
        </p>
      </div>

      <IntroEditor initialHtml={initialHtml} />
    </div>
  )
}
