import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { caseStudies } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "驗屋實績案例",
  description:
    "瀏覽誠昕驗屋於桃園、台北、新北、新竹的驗屋實績案例，了解我們如何運用專業儀器找出房屋缺失，協助屋主守護購屋權益。",
  alternates: { canonical: "/case-studies" },
}

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        title="驗屋實績案例"
        description="每一個案例都是一次專業的把關。透過實際檢測案例，了解驗屋如何為您發現潛藏的房屋問題。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "實績案例" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((c) => (
            <Link
              key={c.slug}
              href={`/case-studies/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={c.image || "/placeholder.svg"}
                  alt={c.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {c.propertyType}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="text-xs font-medium text-secondary">{c.location}</span>
                <h2 className="mt-1.5 text-lg font-bold text-primary">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.problem}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                  查看案例
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
