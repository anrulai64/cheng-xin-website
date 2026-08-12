import type { Metadata } from "next"
import Image from "next/image"
import { ShieldCheck, Target, Eye, HeartHandshake } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { advantages } from "@/lib/site-data"
import { iconMap } from "@/components/shared"

export const metadata: Metadata = {
  title: "關於誠昕驗屋",
  description:
    "誠昕驗屋秉持專業、誠信與細心的服務態度，運用專業檢測儀器為桃園、台北、新北、新竹的購屋者把關屋況，提供值得信賴的驗屋服務。",
  alternates: { canonical: "/about" },
}

const values = [
  { icon: ShieldCheck, title: "專業", desc: "持續精進檢測技術與知識，以標準化流程確保每次驗屋的品質。" },
  { icon: HeartHandshake, title: "誠信", desc: "如實揭露屋況，不誇大、不隱瞞，提供客觀公正的檢測結果。" },
  { icon: Eye, title: "細心", desc: "逐項仔細檢測，連細微缺失都不放過，守護您的購屋權益。" },
  { icon: Target, title: "用心", desc: "站在屋主立場思考，提供清楚易懂的報告與後續諮詢服務。" },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="關於誠昕驗屋"
        description="以專業守護每一個家，讓購屋者買得安心、住得放心。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "關於我們" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl">
            <Image
              src="/about-team.png"
              alt="誠昕驗屋團隊於現場進行房屋檢測"
              width={720}
              height={540}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">Our Story</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-primary sm:text-4xl">用專業，為您的家把關</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
              <p>
                購屋是人生中最重要的決定之一，然而房屋的隱藏缺失往往難以憑肉眼判斷。誠昕驗屋成立的初衷，就是希望以專業的檢測技術，
                協助購屋者在交屋前掌握房屋真實狀況，避免日後產生爭議與額外的修繕負擔。
              </p>
              <p>
                我們服務範圍涵蓋桃園、台北、新北與新竹，提供新成屋驗屋、中古屋驗屋與預售屋驗收等服務。透過熱顯像儀、雷射水平儀、
                水分測試儀等專業設備，將房屋狀況數據化呈現，並彙整為圖文並茂的詳細報告。
              </p>
              <p>
                從預約諮詢、現場檢測到缺失改善追蹤，誠昕驗屋全程陪伴，讓每一位委託我們的屋主都能安心交屋、放心入住。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-accent/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">Core Values</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-primary sm:text-4xl">我們的服務理念</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <v.icon className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-primary">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary">Why Us</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-primary sm:text-4xl">選擇誠昕的理由</h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {advantages.map((a) => {
            const Icon = iconMap[a.icon]
            return (
              <div key={a.title} className="flex gap-4 rounded-xl border border-border bg-card p-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                  {Icon && <Icon className="size-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">{a.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
