import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

/**
 * Shared Case Study card presentation, reused by BOTH the main list
 * (`/case-studies`) and the category pages (`/case-studies/category/[slug]`)
 * so the visual language stays identical. This is pure presentation — data
 * fetching / source-selection stays in each page.
 */

// A single, layout-agnostic shape the card markup renders. Both the Supabase
// query layer and the legacy hard-coded data are normalized into this so the
// existing visual design stays identical regardless of source.
export type CaseCardView = {
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
export const IMAGE_FALLBACK = "/placeholder.svg"

/** Trim + null-collapse helper shared by card producers. */
export function toBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
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
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {card.summary}
          </p>
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

/**
 * A single card. Linked when `card.href` is present, otherwise a non-clickable
 * container (never renders `/case-studies/null` or `/undefined`).
 */
export function CaseCard({ card }: { card: CaseCardView }) {
  if (card.href) {
    return (
      <Link
        href={card.href}
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
      >
        <CaseCardInner card={card} />
      </Link>
    )
  }
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <CaseCardInner card={card} />
    </div>
  )
}

/** The shared responsive grid wrapper used by both list surfaces. */
export function CaseCardGrid({ cards }: { cards: CaseCardView[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CaseCard key={card.key} card={card} />
      ))}
    </div>
  )
}
