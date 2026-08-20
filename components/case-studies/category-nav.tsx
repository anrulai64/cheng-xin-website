import Link from "next/link"
import { getPublicCaseCategories } from "@/lib/case-studies/queries"
import { toBlank } from "@/components/case-studies/case-card"

/**
 * Shared Case Study category navigation, rendered identically on:
 *   - /case-studies                    (activeSlug = null  -> 全部案例 active)
 *   - /case-studies/category/[slug]    (activeSlug = slug  -> that pill active)
 *
 * Real navigable URLs (SEO + accessibility), not client-side filtering. Data
 * comes from the CMS in its configured order (sort_order ASC, created_at ASC);
 * categories without a usable slug are skipped so no `/category/null` link is
 * produced. If the category query fails the nav degrades to nothing rather
 * than crashing the page (genuine page-level errors are handled by the page).
 *
 * This is an async server component; both pages simply `await` it inline.
 */
export async function CategoryNav({ activeSlug = null }: { activeSlug?: string | null }) {
  let categories: Awaited<ReturnType<typeof getPublicCaseCategories>> = []
  try {
    categories = await getPublicCaseCategories()
  } catch {
    return null
  }

  const linkable = categories.filter((c) => toBlank(c.slug))
  if (linkable.length === 0) return null

  const allActive = !activeSlug

  return (
    <nav aria-label="案例分類" className="mb-10 flex flex-wrap gap-2">
      <Link
        href="/case-studies"
        aria-current={allActive ? "page" : undefined}
        className={
          allActive
            ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        }
      >
        全部案例
      </Link>
      {linkable.map((c) => {
        const isActive = activeSlug === c.slug
        return (
          <Link
            key={c.id}
            href={`/case-studies/category/${c.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            }
          >
            {c.name}
          </Link>
        )
      })}
    </nav>
  )
}
