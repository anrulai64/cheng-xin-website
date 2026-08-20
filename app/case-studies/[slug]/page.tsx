import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, AlertTriangle, CheckCircle2, ClipboardCheck, MessageCircle } from "lucide-react"
import { Breadcrumbs, CtaSection } from "@/components/shared"
import { caseStudies, siteConfig } from "@/lib/site-data"
import {
  getPublicCaseBySlug,
  getPublicCaseGallery,
  getPublicCaseFaqs,
  getPublicRelatedCases,
  type PublicCaseDetail,
} from "@/lib/case-studies/queries"
import { SafeHtml } from "@/components/case-studies/safe-html"
import { CaseGallery } from "@/components/case-studies/case-gallery"
import { RelatedCaseCards } from "@/components/case-studies/related-case-cards"
import { CaseInfoTabs } from "@/components/case-studies/case-info-tabs"
import { FaqSchema } from "@/components/structured-data"
import { htmlToPlainExcerpt, htmlToPlainText, sanitizeCaseHtml } from "@/lib/case-studies/sanitize"

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
  // The case id is resolved; gallery + related + shared FAQ reads are
  // independent, so run them in parallel. No client-side fetching.
  const [gallery, relatedCases, faqs] = await Promise.all([
    getPublicCaseGallery(caseItem.id),
    getPublicRelatedCases(caseItem.id),
    getPublicCaseFaqs(),
  ])

  // 「案例介紹」tab source = THIS case's own detail_html (case_items.detail_html),
  // already loaded via getPublicCaseBySlug — NOT the shared case_intro_content.
  // Sanitize on the SERVER (sanitizeCaseHtml is server-only) before handing the
  // trusted markup to the client tab component (which renders inside
  // `.case-content`, matching the SafeHtml path). Empty sanitized detail => no
  // 案例介紹 tab; zero visible FAQs => no 常見問題 tab; both empty => hide section.
  const detailClean = sanitizeCaseHtml(caseItem.detail_html)
  const detailTabHtml = detailClean.length > 0 ? detailClean : null

  const cleanFaqs = faqs
    .map((f) => ({ id: f.id, question: f.question, answerHtml: sanitizeCaseHtml(f.answer_html) }))
    .filter((f) => f.answerHtml.length > 0)

  const hasSharedInfo = detailTabHtml !== null || cleanFaqs.length > 0

  // FAQPage JSON-LD uses the SAME visible FAQ entries shown on the page, with
  // acceptedAnswer.text as plain text (no HTML) derived from the sanitized
  // answer. Emitted only when visible FAQs exist.
  const faqSchemaItems = cleanFaqs
    .map((f) => ({ q: f.question, a: htmlToPlainText(f.answerHtml) }))
    .filter((f) => f.a.length > 0)

  // The full gallery (order = getPublicCaseGallery: sort_order ASC,
  // created_at ASC) is handed to CaseGallery, which owns selected-image state
  // and renders the large image + thumbnails. gallery[0] is the default.
  const location = caseItem.location?.trim()
  const category = caseItem.category_name?.trim()
  const hasIntro = Boolean(caseItem.description_html && caseItem.description_html.trim())

  // 案例基本資料: label→value pairs. Blank/null values are omitted (no fake
  // "未設定" placeholder). 所在地 reuses `location`; the four new fields follow.
  const basicInfo = [
    { label: "所在地", value: caseItem.location?.trim() },
    { label: "類別", value: caseItem.property_type?.trim() },
    { label: "屋況", value: caseItem.property_condition?.trim() },
    { label: "坪數", value: caseItem.floor_area?.trim() },
    { label: "格局", value: caseItem.layout?.trim() },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value))

  // LINE 預約 renders ONLY when a usable official LINE URL exists in the shared
  // site config (no fake/guessed URL). 我要驗屋 always links to /contact.
  const lineUrl = siteConfig.line?.trim() ? siteConfig.line.trim() : null

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

        {/*
          Full CMS gallery: large current image + thumbnail navigation +
          lightbox. Owns selected-image state client-side. Zero images falls
          back to a placeholder large image (handled inside CaseGallery).
        */}
        <CaseGallery images={gallery} caseName={caseItem.name} />

        {/*
          案例基本資料: clean information grid. Rendered only when at least one
          field is present; otherwise hidden entirely (no empty card). The CTA
          action area below renders regardless so incomplete historical cases
          still expose 我要驗屋 / LINE 預約.
        */}
        {basicInfo.length > 0 && (
          <section className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-primary">案例基本資料</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {basicInfo.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline gap-4 border-b border-border/60 pb-3"
                >
                  <dt className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Public CTA buttons (not per-case fields). */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ClipboardCheck className="size-4" />
            我要驗屋
          </Link>
          {lineUrl && (
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-secondary bg-secondary/10 px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/20"
            >
              <MessageCircle className="size-4" />
              LINE 預約
            </a>
          )}
        </div>

        {hasIntro && (
          <div className="mt-10 rounded-2xl border border-border bg-accent/40 p-6">
            <SafeHtml html={caseItem.description_html} className="leading-relaxed text-foreground" />
          </div>
        )}

        {/*
          「案例介紹 / 常見問題」section.
          案例介紹 → THIS case's detail_html (case_items.detail_html).
          常見問題 → shared visible case_faqs.
          Rendered only when at least one side has content; the tab component
          drops any side that is empty. detail_html is rendered ONLY here now
          (no separate body block above) to avoid duplicate content.
          NOT applied to LegacyCaseView.
        */}
        {hasSharedInfo ? (
          <CaseInfoTabs introHtml={detailTabHtml} faqs={cleanFaqs} />
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

      {/* FAQPage structured data — same visible FAQ entries as rendered above. */}
      {faqSchemaItems.length > 0 ? <FaqSchema faqs={faqSchemaItems} /> : null}

      {/*
        Real CMS-configured related cases (directional + visibility-filtered by
        getPublicRelatedCases). Hidden entirely when none are configured — never
        falls back to arbitrary other cases.
      */}
      <RelatedCaseCards cases={relatedCases} />

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
