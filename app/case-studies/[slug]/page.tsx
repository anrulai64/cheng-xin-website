import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Breadcrumbs, CtaSection } from "@/components/shared"
import { caseStudies } from "@/lib/site-data"

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const item = caseStudies.find((c) => c.slug === slug)
  if (!item) return {}
  return {
    title: `${item.title}｜驗屋實績案例`,
    description: item.problem,
    alternates: { canonical: `/case-studies/${item.slug}` },
  }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = caseStudies.find((c) => c.slug === slug)
  if (!item) notFound()

  const related = caseStudies.filter((c) => c.slug !== slug).slice(0, 3)

  return (
    <>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Breadcrumbs
          items={[
            { name: "首頁", href: "/" },
            { name: "實績案例", href: "/case-studies" },
            { name: item.title },
          ]}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {item.propertyType}
          </span>
          <span className="text-sm font-medium text-secondary">{item.location}</span>
        </div>

        <h1 className="mt-4 text-balance font-serif text-3xl font-bold text-primary sm:text-4xl">
          {item.title}
        </h1>

        <div className="mt-8 overflow-hidden rounded-2xl">
          <Image
            src={item.image || "/placeholder.svg"}
            alt={item.title}
            width={896}
            height={504}
            className="w-full object-cover"
          />
        </div>

        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-border bg-destructive/5 p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <h2 className="text-lg font-bold">檢出問題</h2>
            </div>
            <p className="mt-3 leading-relaxed text-foreground">{item.problem}</p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/5 p-6">
            <div className="flex items-center gap-2 text-secondary">
              <CheckCircle2 className="size-5" />
              <h2 className="text-lg font-bold">處理與建議</h2>
            </div>
            <p className="mt-3 leading-relaxed text-foreground">{item.solution}</p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-accent/50 p-6 leading-relaxed text-muted-foreground">
          <p>
            這個案例再次說明專業驗屋的重要性。許多缺失在交屋當下不易察覺，卻可能在入住後逐漸顯現並造成困擾。
            誠昕驗屋透過專業儀器與系統化檢測，協助屋主在第一時間掌握問題並要求改善，避免後續爭議與額外負擔。
          </p>
        </div>

        <Link
          href="/case-studies"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回所有案例
        </Link>
      </article>

      <section className="bg-accent/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="font-serif text-2xl font-bold text-primary">更多實績案例</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {related.map((c) => (
              <Link
                key={c.slug}
                href={`/case-studies/${c.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={c.image || "/placeholder.svg"}
                    alt={c.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs font-medium text-secondary">{c.location}</span>
                  <h3 className="mt-1 font-bold text-primary">{c.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
