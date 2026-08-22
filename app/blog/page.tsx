import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Clock } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { blogPosts } from "@/lib/site-data"
import { getPublicCmsArticleList } from "@/lib/articles/public"

// STEP A6-D: the Blog index now mixes statically-defined Legacy posts with
// CMS Articles that must be evaluated fresh against the Asia/Taipei
// start_date/end_date scheduling window on every request (the exact same
// staleness problem already solved for /blog/[slug] in A6-A-FIX2). No ISR,
// no revalidateTag/unstable_cache — a plain per-request dynamic render.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "驗屋知識文章",
  description:
    "誠昕驗屋分享驗屋知識、檢測儀器解析與購屋把關指南，協助您了解驗屋的重要性與各類房屋的檢測重點。",
  alternates: { canonical: "/blog" },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
}

// Smallest shared render shape for the mixed lower grid. Legacy entries keep
// their `image`; CMS entries never have one (Cover Image is unimplemented) —
// `image` is optional, never defaulted to a placeholder/site/logo image.
type BlogIndexEntry = {
  source: "legacy" | "cms"
  slug: string
  title: string
  excerpt: string
  category: string | null
  date: string
  image?: string
}

export default async function BlogPage() {
  // The first Legacy post is always the featured card — a strict regression
  // lock from A6-D. CMS Articles are never eligible for this slot.
  const [featured, ...legacyRest] = blogPosts

  const legacySlugs = new Set(blogPosts.map((post) => post.slug))

  // CMS query failure must never take down the whole index — fall back to
  // Legacy-only rendering (mirrors app/sitemap.ts's existing try/catch
  // fallback for Case Study entries). Never surface a raw DB error to the UI.
  let cmsArticles: Awaited<ReturnType<typeof getPublicCmsArticleList>> = []
  try {
    cmsArticles = await getPublicCmsArticleList()
  } catch (error) {
    console.error("[v0] blog index: CMS article list failed; rendering legacy-only", error)
    cmsArticles = []
  }

  const legacyEntries: BlogIndexEntry[] = legacyRest.map((post) => ({
    source: "legacy",
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    date: post.date,
    image: post.image,
  }))

  const cmsEntries: BlogIndexEntry[] = cmsArticles
    // A CMS Article sharing a Legacy slug never appears as a duplicate card
    // and never replaces the Legacy Article — the Legacy owner wins.
    .filter((article) => !legacySlugs.has(article.slug))
    .map((article) => ({
      source: "cms",
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt ?? "",
      category: article.category_name,
      date: article.publish_date,
    }))

  const mixedEntries = [...legacyEntries, ...cmsEntries].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1 // date DESC
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0 // slug ASC tie-breaker
  })

  return (
    <>
      <PageHero
        title="驗屋知識文章"
        description="從驗屋觀念、檢測儀器到各類房屋的把關重點，誠昕驗屋帶您一步步了解安心購屋的關鍵知識。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "驗屋知識" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* Featured post */}
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid gap-6 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2"
        >
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
            <Image
              src={featured.image || "/placeholder.svg"}
              alt={featured.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-10">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full bg-accent px-3 py-1 font-medium text-primary">{featured.category}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" />
                {featured.readTime}
              </span>
            </div>
            <h2 className="mt-4 text-balance font-serif text-2xl font-bold text-primary sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{featured.excerpt}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-secondary">
              閱讀全文
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        {/* Mixed lower grid: remaining Legacy posts (image-based) + eligible
            visible CMS Articles (intentionally image-free — Cover Image is
            not yet implemented; see components/articles). Sorted by date
            DESC, slug ASC. */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {mixedEntries.map((entry) =>
            entry.source === "legacy" ? (
              <Link
                key={entry.slug}
                href={`/blog/${entry.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={entry.image || "/placeholder.svg"}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-accent px-2.5 py-0.5 font-medium text-primary">
                      {entry.category}
                    </span>
                    <span className="text-muted-foreground">{formatDate(entry.date)}</span>
                  </div>
                  <h3 className="mt-3 text-balance font-bold leading-snug text-primary">{entry.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{entry.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                    閱讀全文
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ) : (
              // CMS card: intentionally no image region — no placeholder, no
              // site/logo image, no broken-image UI. A text-forward layout
              // that still visually belongs to the same grid.
              <Link
                key={entry.slug}
                href={`/blog/${entry.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-3 text-xs">
                    {entry.category && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 font-medium text-primary">
                        {entry.category}
                      </span>
                    )}
                    <span className="text-muted-foreground">{formatDate(entry.date)}</span>
                  </div>
                  <h3 className="mt-3 text-balance font-bold leading-snug text-primary">{entry.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.excerpt}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                  閱讀全文
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
