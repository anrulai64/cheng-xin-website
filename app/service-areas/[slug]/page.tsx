import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Check, MapPin, ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { FaqAccordion } from "@/components/faq-accordion"
import { serviceAreas, services, faqs, equipment, siteConfig } from "@/lib/site-data"
import { iconMap } from "@/components/shared"

export function generateStaticParams() {
  return serviceAreas.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const area = serviceAreas.find((a) => a.slug === slug)
  if (!area) return {}
  return {
    title: `${area.title}｜新成屋・中古屋・預售屋驗屋`,
    description: `誠昕驗屋提供${area.name}地區專業驗屋服務，涵蓋新成屋驗屋、中古屋驗屋與預售屋驗收，運用專業儀器把關屋況，守護您的購屋品質。`,
    alternates: { canonical: `/service-areas/${area.slug}` },
  }
}

export default async function ServiceAreaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const area = serviceAreas.find((a) => a.slug === slug)
  if (!area) notFound()

  return (
    <>
      <PageHero
        title={`${area.name}驗屋服務`}
        description={`誠昕驗屋深耕${area.name}地區，提供新成屋、中古屋與預售屋的專業檢測服務，以在地化的服務為您的購屋決策把關。`}
        breadcrumbs={[
          { name: "首頁", href: "/" },
          { name: "服務區域" },
          { name: `${area.name}驗屋` },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex items-center gap-2 text-secondary">
          <MapPin className="size-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Local Service</span>
        </div>
        <h2 className="mt-2 max-w-3xl font-serif text-2xl font-bold text-primary sm:text-3xl">
          在地{area.name}驗屋，為您的購屋品質嚴格把關
        </h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
          無論您在{area.name}購買的是新成屋、中古屋或預售屋，誠昕驗屋都能提供專業且詳盡的檢測服務。我們熟悉{area.name}
          常見的建築類型與屋況問題，以熱顯像儀、雷射水平儀等專業設備，協助您於交屋或成交前全面掌握房屋狀況。
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-bold text-primary">
                {area.name}
                {s.name}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.shortDesc}</p>
              <ul className="mt-4 space-y-2">
                {s.items.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                了解服務內容
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">{area.name}驗屋使用的專業儀器</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {equipment.map((item) => {
              const Icon = iconMap[item.icon]
              return (
                <div key={item.name} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
                    {Icon && <Icon className="size-6" />}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{item.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-serif text-2xl font-bold text-primary sm:text-3xl">其他服務區域</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {serviceAreas
            .filter((a) => a.slug !== slug)
            .map((a) => (
              <Link
                key={a.slug}
                href={`/service-areas/${a.slug}`}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-secondary hover:text-secondary"
              >
                {a.fullName}
              </Link>
            ))}
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

      <CtaSection
        title={`預約${area.name}專業驗屋服務`}
        description={`誠昕驗屋就在您身邊，立即來電 ${siteConfig.phone} 或加 LINE 諮詢${area.name}驗屋服務。`}
      />
    </>
  )
}
