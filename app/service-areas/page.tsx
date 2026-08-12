import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { serviceAreas, siteConfig } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "服務區域",
  description:
    "誠昕驗屋提供桃園、台北、新北、新竹地區專業驗屋服務，涵蓋新成屋、中古屋與預售屋檢測，以在地化服務為您的購屋品質把關。",
  alternates: { canonical: "/service-areas" },
}

export default function ServiceAreasPage() {
  return (
    <>
      <PageHero
        title="服務區域"
        description="誠昕驗屋深耕北台灣，提供桃園、台北、新北、新竹地區的專業驗屋服務。點選您所在的區域，了解在地化的檢測內容。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "服務區域" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {serviceAreas.map((area) => (
            <Link
              key={area.slug}
              href={`/service-areas/${area.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <MapPin className="size-6" />
              </span>
              <h2 className="mt-5 font-serif text-2xl font-bold text-primary">{area.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {area.name}地區新成屋、中古屋、預售屋專業驗屋服務。
              </p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                查看服務內容
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          您的區域不在名單中？歡迎來電 {siteConfig.phone} 洽詢，我們將盡力為您安排服務。
        </p>
      </section>

      <CtaSection />
    </>
  )
}
