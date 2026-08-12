import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SectionHeading, iconMap } from "@/components/shared"
import { FaqAccordion } from "@/components/faq-accordion"
import {
  advantages,
  services,
  inspectionProcess,
  equipment,
  commonDefects,
  serviceAreas,
  testimonials,
  faqs,
} from "@/lib/site-data"

export function WhyChooseUs() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Choose Us"
          title="為什麼選擇誠昕驗屋"
          description="以專業儀器、嚴謹流程與豐富經驗，為您的購屋決策提供最可靠的依據。"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item) => {
            const Icon = iconMap[item.icon]
            return (
              <Card key={item.title} className="border-border p-6 transition-shadow hover:shadow-md">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  {Icon && <Icon className="size-6" />}
                </span>
                <h3 className="mt-4 text-lg font-bold text-primary">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function ServicesOverview() {
  return (
    <section className="bg-accent/40 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Services"
          title="專業驗屋服務項目"
          description="依房屋類型提供量身打造的驗屋方案，全方位守護您的居住品質。"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {services.map((s, i) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="font-serif text-sm font-bold text-secondary">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl font-bold text-primary">{s.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {s.shortDesc}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                了解更多
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProcessSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Process"
          title="驗屋服務流程"
          description="從預約到缺失追蹤，五個步驟讓您驗屋過程清楚透明、安心無憂。"
        />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {inspectionProcess.map((step) => (
            <li key={step.step} className="relative rounded-2xl border border-border bg-card p-6">
              <span className="font-serif text-3xl font-bold text-secondary/30">{step.step}</span>
              <h3 className="mt-2 text-base font-bold text-primary">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function EquipmentSection() {
  return (
    <section className="bg-primary py-16 text-primary-foreground lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary">Equipment</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">專業檢測儀器</h2>
          <p className="mt-4 leading-relaxed text-primary-foreground/70">
            運用專業設備將肉眼難以察覺的問題數據化，讓檢測結果客觀、可信。
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
  )
}

export function DefectsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Common Defects"
          title="常見房屋缺失"
          description="這些是驗屋時最常檢出的問題，及早發現才能避免日後高額修繕與居住困擾。"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {commonDefects.map((d) => {
            const Icon = iconMap[d.icon]
            return (
              <div key={d.title} className="flex gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  {Icon && <Icon className="size-5" />}
                </span>
                <div>
                  <h3 className="text-base font-bold text-primary">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function AreasSection() {
  return (
    <section className="bg-accent/40 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Service Areas"
          title="服務區域"
          description="深耕北台灣，提供桃園、台北、新北、新竹在地專業驗屋服務。"
        />
        <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {serviceAreas.map((a) => (
            <Link
              key={a.slug}
              href={`/service-areas/${a.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg"
            >
              <span className="font-serif text-4xl font-bold text-primary">{a.name}</span>
              <p className="mt-2 text-sm font-medium text-secondary">{a.fullName}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="客戶真實回饋"
          description="許多屋主因為驗屋而避免了潛在風險，他們的安心是我們最大的肯定。"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex gap-0.5 text-secondary" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-lg leading-none">★</span>
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                「{t.content}」
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <div className="text-sm font-bold text-primary">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.location}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeFaqSection() {
  return (
    <section className="bg-accent/40 py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="常見問題"
          description="關於驗屋服務的常見疑問，我們在這裡為您解答。"
          align="left"
        />
        <div className="rounded-2xl border border-border bg-card px-6">
          <FaqAccordion items={faqs.slice(0, 5)} />
        </div>
      </div>
    </section>
  )
}
