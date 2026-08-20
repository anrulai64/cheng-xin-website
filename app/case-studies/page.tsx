import type { Metadata } from "next"
import Link from "next/link"
import { PageHero, CtaSection } from "@/components/shared"
import { caseStudies } from "@/lib/site-data"
import { getPublicCaseList, getPublicCaseCategories } from "@/lib/case-studies/queries"
import {
  type CaseCardView,
  IMAGE_FALLBACK,
  toBlank,
  CaseCardGrid,
} from "@/components/case-studies/case-card"

export const metadata: Metadata = {
  title: "驗屋實績案例",
  description:
    "瀏覽誠昕驗屋於桃園、台北、新北、新竹的驗屋實績案例，了解我們如何運用專業儀器找出房屋缺失，協助屋主守護購屋權益。",
  alternates: { canonical: "/case-studies" },
}

/**
 * Chooses the data source per STEP 12D rules:
 *   - Supabase succeeds AND returns >= 1 case  -> Supabase only
 *   - Supabase succeeds AND returns 0 cases    -> legacy fallback
 *   - Supabase throws                          -> legacy fallback (silent)
 * The two sources are never combined.
 */
async function getCaseCards(): Promise<CaseCardView[]> {
  try {
    const cases = await getPublicCaseList()
    if (cases.length > 0) {
      return cases.map((c) => {
        const slug = toBlank(c.slug)
        return {
          key: c.id,
          // Never link to /case-studies/null or /undefined.
          href: slug ? `/case-studies/${slug}` : null,
          title: c.name,
          badge: toBlank(c.category_name),
          location: toBlank(c.location),
          summary: toBlank(c.short_description),
          imageSrc: c.cover?.public_url || IMAGE_FALLBACK,
          // Prefer the CMS alt text, fall back to the case name.
          imageAlt: toBlank(c.cover?.alt_text) ?? c.name,
        }
      })
    }
  } catch {
    // Query layer already logs server-side. Fall back silently; never surface
    // database diagnostics to visitors.
  }

  // Fallback: legacy hard-coded cases (unchanged design semantics).
  return caseStudies.map((c) => ({
    key: c.slug,
    href: `/case-studies/${c.slug}`,
    title: c.title,
    badge: c.propertyType,
    location: c.location,
    summary: c.problem,
    imageSrc: c.image || IMAGE_FALLBACK,
    imageAlt: c.title,
  }))
}

/**
 * Category navigation: real navigable URLs (SEO + accessibility), not
 * client-side filtering. "全部案例" is active here. Categories come from the
 * CMS in their configured order; ones without a usable slug are skipped so no
 * `/category/null` link is ever produced. Errors degrade to no nav.
 */
async function CategoryNav() {
  let categories: Awaited<ReturnType<typeof getPublicCaseCategories>> = []
  try {
    categories = await getPublicCaseCategories()
  } catch {
    return null
  }

  const linkable = categories.filter((c) => toBlank(c.slug))
  if (linkable.length === 0) return null

  return (
    <nav aria-label="案例分類" className="mb-10 flex flex-wrap gap-2">
      <Link
        href="/case-studies"
        aria-current="page"
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        全部案例
      </Link>
      {linkable.map((c) => (
        <Link
          key={c.id}
          href={`/case-studies/category/${c.slug}`}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {c.name}
        </Link>
      ))}
    </nav>
  )
}

export default async function CaseStudiesPage() {
  const cards = await getCaseCards()

  return (
    <>
      <PageHero
        title="驗屋實績案例"
        description="每一個案例都是一次專業的把關。透過實際檢測案例，了解驗屋如何為您發現潛藏的房屋問題。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "實績案例" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <CategoryNav />
        <CaseCardGrid cards={cards} />
      </section>

      <CtaSection />
    </>
  )
}
