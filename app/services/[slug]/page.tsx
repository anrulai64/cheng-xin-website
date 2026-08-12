import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Check, AlertTriangle, ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { FaqAccordion } from "@/components/faq-accordion"
import { services, inspectionProcess, faqs, siteConfig } from "@/lib/site-data"

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const service = services.find((s) => s.slug === slug)
  if (!service) return {}
  return {
    title: service.name,
    description: service.shortDesc,
    alternates: { canonical: `/services/${service.slug}` },
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const service = services.find((s) => s.slug === slug)
  if (!service) notFound()

  const others = services.filter((s) => s.slug !== slug)

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.shortDesc,
    provider: { "@type": "LocalBusiness", name: siteConfig.name, telephone: siteConfig.phone },
    areaServed: ["桃園", "台北", "新北", "新竹"],
    serviceType: "驗屋服務",
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <PageHero
        title={service.name}
        description={service.shortDesc}
        breadcrumbs={[
          { name: "首頁", href: "/" },
          { name: "服務項目", href: "/services" },
          { name: service.name },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-2xl font-bold text-primary">服務說明</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{service.description}</p>

            <h3 className="mt-10 font-serif text-xl font-bold text-primary">檢測項目</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3.5 text-sm text-foreground"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 font-serif text-xl font-bold text-primary">常見缺失問題</h3>
            <ul className="mt-5 space-y-3">
              {service.problems.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-lg bg-destructive/5 p-4 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span className="text-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-border bg-accent/40 p-6">
                <h3 className="font-bold text-primary">驗屋流程</h3>
                <ol className="mt-4 space-y-4">
                  {inspectionProcess.map((p) => (
                    <li key={p.step} className="flex gap-3">
                      <span className="font-serif text-sm font-bold text-secondary">{p.step}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
                <h3 className="font-bold">需要進一步諮詢？</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
                  歡迎來電或加 LINE，由專人為您說明{service.name}的細節與報價。
                </p>
                <a
                  href={`tel:${siteConfig.phoneRaw}`}
                  className="mt-4 block rounded-lg bg-secondary px-4 py-2.5 text-center text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
                >
                  {siteConfig.phone}
                </a>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-16 border-t border-border pt-12">
          <h2 className="font-serif text-2xl font-bold text-primary">其他驗屋服務</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/services/${o.slug}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div>
                  <h3 className="font-bold text-primary">{o.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{o.shortDesc}</p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-accent/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-center font-serif text-3xl font-bold text-primary">常見問題</h2>
          <div className="mt-8">
            <FaqAccordion items={faqs.slice(0, 4)} />
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
