import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { services, inspectionProcess } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "驗屋服務項目",
  description:
    "誠昕驗屋提供新成屋驗屋、中古屋驗屋與預售屋驗收三大服務，以專業檢測儀器與標準化流程，全面把關您的購屋品質。",
  alternates: { canonical: "/services" },
}

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title="驗屋服務項目"
        description="針對不同屋況提供專業檢測，從新成屋、中古屋到預售屋，誠昕驗屋為您層層把關。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "服務項目" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.slug}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
            >
              <h2 className="font-serif text-2xl font-bold text-primary">{s.name}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s.shortDesc}</p>
              <ul className="mt-6 space-y-2.5">
                {s.items.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/services/${s.slug}`}
                className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary"
              >
                了解詳情
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-accent/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">Process</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-primary sm:text-4xl">驗屋服務流程</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {inspectionProcess.map((p) => (
              <div key={p.step} className="rounded-xl border border-border bg-card p-6">
                <span className="font-serif text-3xl font-bold text-secondary/40">{p.step}</span>
                <h3 className="mt-3 font-bold text-primary">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
