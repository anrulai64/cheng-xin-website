import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { caseStudies } from "@/lib/site-data"
import { getPublicCaseList } from "@/lib/case-studies/queries"

export const metadata: Metadata = {
  title: "驗屋實績案例",
  description:
    "瀏覽誠昕驗屋於桃園、台北、新北、新竹的驗屋實績案例，了解我們如何運用專業儀器找出房屋缺失，協助屋主守護購屋權益。",
  alternates: { canonical: "/case-studies" },
}

/**
 * A single, layout-agnostic shape the card markup renders. Both the Supabase
 * query layer and the legacy hard-coded data are normalized into this so the
 * existing visual design stays identical regardless of source. The two sources
 * are never merged — see the selection logic in the page component.
 */
type CaseCardView = {
  key: string
  /** Detail URL, or null when no usable slug exists (card renders un-linked). */
  href: string | null
  title: string
  /** Maps to the propertyType badge; omitted when null. */
  badge: string | null
  /** Location line; omitted when null/blank. */
  location: string | null
  summary: string | null
  imageSrc: string
  imageAlt: string
}

// Neutral local fallback that preserves the image area without inventing a
// remote asset. Already used by the legacy design.
const IMAGE_FALLBACK = "/placeholder.svg"

function toBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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

function CaseCardInner({ card }: { card: CaseCardView }) {
  return (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={card.imageSrc || IMAGE_FALLBACK}
          alt={card.imageAlt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {card.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {card.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {card.location ? (
          <span className="text-xs font-medium text-secondary">{card.location}</span>
        ) : null}
        <h2 className="mt-1.5 text-lg font-bold text-primary">{card.title}</h2>
        {card.summary ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{card.summary}</p>
        ) : (
          <div className="flex-1" />
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
          查看案例
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </>
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
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) =>
            card.href ? (
              <Link
                key={card.key}
                href={card.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <CaseCardInner card={card} />
              </Link>
            ) : (
              <div
                key={card.key}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <CaseCardInner card={card} />
              </div>
            ),
          )}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
