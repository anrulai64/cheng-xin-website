import Link from "next/link"
import Image from "next/image"
import type { PublicCaseCard } from "@/lib/case-studies/queries"

/**
 * Public "更多實績案例" section for CMS-driven detail pages. Reuses the legacy
 * section's location/visual style. Renders ONLY the actual configured related
 * cases (directional, visibility-filtered upstream by getPublicRelatedCases).
 *
 * A case with no usable slug is rendered non-clickable (no fake URL), matching
 * the public card safety behavior on the list page.
 */
export function RelatedCaseCards({ cases }: { cases: PublicCaseCard[] }) {
  if (cases.length === 0) return null

  return (
    <section className="bg-accent/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-serif text-2xl font-bold text-primary">更多實績案例</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {cases.map((c) => {
            const inner = (
              <>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={c.cover?.public_url || "/placeholder.svg"}
                    alt={c.cover?.alt_text || c.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  {c.category_name && (
                    <span className="text-xs font-medium text-secondary">
                      {c.category_name}
                    </span>
                  )}
                  <h3 className="mt-1 font-bold text-primary">{c.name}</h3>
                  {c.location?.trim() && (
                    <p className="mt-1 text-xs text-muted-foreground">{c.location}</p>
                  )}
                  {c.short_description?.trim() && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {c.short_description}
                    </p>
                  )}
                </div>
              </>
            )

            const cardClass =
              "group overflow-hidden rounded-2xl border border-border bg-card transition-all"

            // No usable slug -> non-clickable card (never a fake /null URL).
            if (!c.slug) {
              return (
                <div key={c.id} className={cardClass}>
                  {inner}
                </div>
              )
            }

            return (
              <Link
                key={c.id}
                href={`/case-studies/${c.slug}`}
                className={`${cardClass} hover:-translate-y-1 hover:shadow-lg`}
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
