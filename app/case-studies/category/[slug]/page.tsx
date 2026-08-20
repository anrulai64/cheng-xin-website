import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { PageHero, CtaSection } from "@/components/shared"
import {
  getPublicCaseCategoryBySlug,
  getPublicCaseListByCategory,
} from "@/lib/case-studies/queries"
import {
  type CaseCardView,
  IMAGE_FALLBACK,
  toBlank,
  CaseCardGrid,
} from "@/components/case-studies/case-card"
import { CategoryNav } from "@/components/case-studies/category-nav"

// CMS-created category slugs must work without hard-coded generateStaticParams.
// The shared Supabase server client reads cookies, so this route resolves
// dynamically — acceptable per STEP 12I (correctness over forced SSG).

type CategoryPageProps = {
  // Next.js 16: params is async.
  params: Promise<{ slug: string }>
}

/** Deterministic description fallback based on the category name. */
function fallbackDescription(name: string): string {
  return `瀏覽誠昕驗屋的${name}實績案例，了解我們如何透過專業儀器與系統化檢測，協助屋主找出房屋缺失並要求改善。`
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getPublicCaseCategoryBySlug(slug)

  // Unknown category: return safe, minimal metadata (page itself 404s).
  if (!category) {
    return { title: "找不到分類｜誠昕驗屋", robots: { index: false, follow: false } }
  }

  // TITLE precedence: seo_title -> `${name}實績案例｜誠昕驗屋`.
  const title = toBlank(category.seo_title) ?? `${category.name}實績案例｜誠昕驗屋`

  // DESCRIPTION precedence: seo_description -> deterministic name-based fallback.
  const description = toBlank(category.seo_description) ?? fallbackDescription(category.name)

  // KEYWORDS: mirror the Case detail logic (split on ASCII/Chinese comma).
  const keywords = toBlank(category.seo_keywords)
    ? category.seo_keywords!
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined

  const canonical = `/case-studies/category/${category.slug ?? slug}`

  // OG image only when a real category image exists (no invented images).
  const ogImage = toBlank(category.image_url)

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

export default async function CaseCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  const category = await getPublicCaseCategoryBySlug(slug)
  // Unknown category slug -> 404 (never redirect to /case-studies).
  if (!category) notFound()

  // CMS-only: only this category's visible cases, via the shared visibility
  // rule. Never falls back to legacy hard-coded cases.
  const cases = await getPublicCaseListByCategory(category.id)

  const cards: CaseCardView[] = cases.map((c) => {
    const caseSlug = toBlank(c.slug)
    return {
      key: c.id,
      href: caseSlug ? `/case-studies/${caseSlug}` : null,
      title: c.name,
      badge: toBlank(c.category_name),
      location: toBlank(c.location),
      summary: toBlank(c.short_description),
      imageSrc: c.cover?.public_url || IMAGE_FALLBACK,
      imageAlt: toBlank(c.cover?.alt_text) ?? c.name,
    }
  })

  const heroImage = toBlank(category.image_url)
  const seoDescription = toBlank(category.seo_description)

  return (
    <>
      <PageHero
        title={category.name}
        description={seoDescription ?? undefined}
        breadcrumbs={[
          { name: "首頁", href: "/" },
          { name: "實績案例", href: "/case-studies" },
          { name: category.name },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* Same shared nav as /case-studies; this category's pill is active. */}
        <CategoryNav activeSlug={category.slug ?? slug} />

        {/* Restrained category visual, only when a real image exists. */}
        {heroImage ? (
          <div className="mb-10 overflow-hidden rounded-2xl">
            <div className="relative aspect-[21/9] w-full">
              <Image
                src={heroImage || IMAGE_FALLBACK}
                alt={`${category.name}案例`}
                fill
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        {cards.length > 0 ? (
          <CaseCardGrid cards={cards} />
        ) : (
          <p className="rounded-2xl border border-border bg-card px-6 py-16 text-center leading-relaxed text-muted-foreground">
            目前此分類尚無公開案例。
          </p>
        )}
      </section>

      <CtaSection />
    </>
  )
}
