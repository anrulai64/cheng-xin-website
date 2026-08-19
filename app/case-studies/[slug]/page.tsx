import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Breadcrumbs, CtaSection } from "@/components/shared"
import { caseStudies } from "@/lib/site-data"
import {
  getPublicCaseBySlug,
  getPublicCaseGallery,
  type PublicCaseDetail,
} from "@/lib/case-studies/queries"
import { SafeHtml } from "@/components/case-studies/safe-html"
import { htmlToPlainExcerpt } from "@/lib/case-studies/sanitize"

// Prebuild the six historical (legacy) slugs so their URLs keep SSG behavior.
// `dynamicParams` stays at its default (true), so CMS cases created after the
// build still render on demand without a redeploy.
export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }))
}

type LegacyCase = (typeof caseStudies)[number]

// Mutually-exclusive resolution: Supabase (CMS) first, then legacy fallback
// ONLY to preserve the six historical URLs during migration. Never merged.
type ResolvedCase =
  | { source: "cms"; data: PublicCaseDetail }
  | { source: "legacy"; data: LegacyCase }
  | null

async function resolveCase(slug: string): Promise<ResolvedCase> {
  // 1. Try Supabase by slug (respects public visibility in the query layer).
  const cms = await getPublicCaseBySlug(slug)
  if (cms) return { source: "cms", data: cms }

  // 2. Fall back to the legacy hard-coded case ONLY to keep the six existing
  //    URLs alive while CMS migration is incomplete.
  const legacy = caseStudies.find((c) => c.slug === slug)
  if (legacy) return { source: "legacy", data: legacy }

  // 3. Neither source has it -> genuinely not found.
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveCase(slug)
  if (!resolved) return {}

  if (resolved.source === "legacy") {
    const item = resolved.data
    return {
      title: `${item.title}｜驗屋實績案例`,
      description: item.problem,
      alternates: { canonical: `/case-studies/${item.slug}` },
    }
  }

  const c = resolved.data
  const canonicalSlug = c.slug ?? slug

  // TITLE precedence: seo_title -> `${name}｜驗屋實績案例`.
  const title =
    c.seo_title && c.seo_title.trim()
      ? c.seo_title.trim()
      : `${c.name}｜驗屋實績案例`

  // DESCRIPTION precedence: seo_description -> short_description ->
  // plain-text excerpt of detail_html -> reasonable existing fallback.
  const description =
    (c.seo_description && c.seo_description.trim()) ||
    (c.short_description && c.short_description.trim()) ||
    htmlToPlainExcerpt(c.detail_html) ||
    "誠昕驗屋專業驗屋實績案例，透過系統化檢測協助屋主掌握屋況並要求改善。"

  // KEYWORDS: use seo_keywords when present; otherwise inherit global behavior.
  const keywords =
    c.seo_keywords && c.seo_keywords.trim()
      ? c.seo_keywords
          .split(/[,，]/)
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined

  // Cover image for OG (resolved from the gallery's first image).
  const cover = await getCoverImage(c.id)

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: `/case-studies/${canonicalSlug}` },
    openGraph: {
      title,
      description,
      ...(cover ? { images: [{ url: cover.public_url }] } : {}),
    },
    twitter: {
      title,
      description,
      ...(cover ? { images: [cover.public_url] } : {}),
    },
  }
}

// Cover image = first image from the gallery query (full gallery UI is a later
// STEP; here we only need one cover). Returns null when there is none.
async function getCoverImage(
  caseId: string,
): Promise<{ public_url: string; alt_text: string | null } | null> {
  const gallery = await getPublicCaseGallery(caseId)
  const first = gallery[0]
  return first ? { public_url: first.public_url, alt_text: first.alt_text } : null
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const resolved = await resolveCase(slug)
  if (!resolved) notFound()

  if (resolved.source === "legacy") {
    return <LegacyCaseView item={resolved.data} />
  }

  return <CmsCaseView caseItem={resolved.data} />
}

// ---------------------------------------------------------------------------
// CMS-driven detail view (Supabase). No fake problem/solution cards; renders
// sanitized description_html (intro) + detail_html (body).
// ---------------------------------------------------------------------------

async function CmsCaseView({ caseItem }: { caseItem: PublicCaseDetail }) {
  const cover = await getCoverImage(caseItem.id)
  const location = caseItem.location?.trim()
  const category = caseItem.category_name?.trim()
  const hasIntro = Boolean(caseItem.description_html && caseItem.description_html.trim())
  const hasBody = Boolean(caseItem.detail_html && caseItem.detail_html.trim())

  return (
    <>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Breadcrumbs
          items={[
            { name: "首頁", href: "/" },
            { name: "實績案例", href: "/case-studies" },
            { name: caseItem.name },
          ]}
        />

        {(category || location) && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {category && (
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {category}
              </span>
            )}
            {location && (
              <span className="text-sm font-medium text-secondary">{location}</span>
            )}
          </div>
        )}

        <h1 className="mt-4 text-balance font-serif text-3xl font-bold text-primary sm:text-4xl">
          {caseItem.name}
        </h1>

        <div className="mt-8 overflow-hidden rounded-2xl">
          <Image
            src={cover?.public_url || "/placeholder.svg"}
            alt={cover?.alt_text || caseItem.name}
            width={896}
            height={504}
            className="w-full object-cover"
          />
        </div>

        {hasIntro && (
          <div className="mt-10 rounded-2xl border border-border bg-accent/40 p-6">
            <SafeHtml html={caseItem.description_html} className="leading-relaxed text-foreground" />
          </div>
        )}

        {hasBody ? (
          <SafeHtml
            html={caseItem.detail_html}
            className="mt-10 leading-relaxed text-foreground"
          />
        ) : (
          !hasIntro && (
            <p className="mt-10 leading-relaxed text-muted-foreground">
              此案例內容整理中，歡迎透過下方聯絡方式洽詢更多資訊。
            </p>
          )
        )}

        <Link
          href="/case-studies"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回所有案例
        </Link>
      </article>

      {/*
        Related cases ("更多實績案例") are intentionally hidden for CMS-driven
        detail pages in this STEP to avoid mixing CMS data with the legacy
        "first 3 others" list. The real case_related_cases UI is a later STEP.
      */}

      <CtaSection />
    </>
  )
}

// ---------------------------------------------------------------------------
// Legacy hard-coded detail view — unchanged design, preserved ONLY for the six
// historical slugs during migration.
// ---------------------------------------------------------------------------

function LegacyCaseView({ item }: { item: LegacyCase }) {
  const related = caseStudies.filter((c) => c.slug !== item.slug).slice(0, 3)

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
