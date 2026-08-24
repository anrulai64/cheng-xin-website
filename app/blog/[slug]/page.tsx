import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Clock, ArrowLeft, ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { ArticleSchema, BreadcrumbSchema } from "@/components/structured-data"
import { blogPosts, blogContent, siteConfig } from "@/lib/site-data"
import { getPublicCmsArticleBySlug, type PublicArticleDetail } from "@/lib/articles/public"
import { ArticleContent } from "@/components/articles/article-content"

// STEP A6-A-FIX2: CMS Article visibility (status, start_date, end_date) must
// be evaluated fresh on every request. After A6-A-FIX removed the
// cookies()-bound Supabase client, this route became eligible for Next.js's
// static/ISR caching, which let a CMS slug's page get generated once and
// keep serving stale content after an Admin edit (published -> draft/offline,
// schedule window change, or delete). Forcing request-time dynamic rendering
// is the simplest correct fix — no revalidation, tags, or cache-invalidation
// plumbing required. `generateStaticParams` is removed: with the whole route
// forced dynamic, prebuilding the six legacy slugs would provide no SSG
// benefit and would misleadingly imply otherwise. The six legacy Blog
// articles are unchanged in data/content; they now render dynamically like
// every other slug on this route, with legacy lookup still short-circuiting
// before any CMS query runs.
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  // LEGACY-FIRST METADATA OWNERSHIP (STEP A6-B §8): check Legacy first and
  // return its exact existing metadata immediately on a match — unchanged
  // from before this STEP. A CMS row can never be queried, let alone override
  // Legacy metadata, when a legacy slug collision exists.
  const post = blogPosts.find((p) => p.slug === slug)
  if (post) {
    return {
      title: post.title,
      description: post.excerpt,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        type: "article",
        title: post.title,
        description: post.excerpt,
        images: [{ url: post.image }],
        publishedTime: post.date,
      },
    }
  }

  // No Legacy match — attempt the CMS Article metadata contract (STEP A6-B).
  // getPublicCmsArticleBySlug() already enforces the full public visibility
  // contract (status + start_date/end_date, defense in depth), so it is the
  // ONLY query used here — never a separate/weaker metadata-only lookup, and
  // never a service_role or authenticated fallback. A null result (missing,
  // draft, offline, or outside the schedule window) must never leak any CMS
  // field into metadata.
  const cmsArticle = await getPublicCmsArticleBySlug(slug)
  if (!cmsArticle) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const resolvedTitle = cmsArticle.seo_title?.trim() ? cmsArticle.seo_title.trim() : cmsArticle.title
  const resolvedDescription = cmsArticle.seo_description?.trim()
    ? cmsArticle.seo_description.trim()
    : cmsArticle.excerpt ?? undefined
  const resolvedKeywords = cmsArticle.seo_keywords?.trim() ? cmsArticle.seo_keywords.trim() : undefined
  const canonical = `/blog/${cmsArticle.slug}`

  // STEP A7-D — CMS Cover SEO source. The ONLY image source is the trusted
  // public `cover_image_url` persisted by the A7-B2 Server Action; never
  // cover_image_path, never a reverse-parsed Storage path, never a
  // content_html image, never an Admin filename. A null/blank URL means "this
  // Article has no cover" -> we fabricate NO route-specific OG/Twitter image
  // (no hero-inspection.png, no Legacy image, no stock, no empty string).
  const coverUrl = cmsArticle.cover_image_url?.trim() ? cmsArticle.cover_image_url.trim() : undefined
  // og:image:alt / twitter:image alt — reuses the same A7-C alt contract
  // (trimmed cover_alt, else Article title). Only ever attached to an image
  // that actually exists, so it never produces a dangling alt.
  const coverAlt = cmsArticle.cover_alt?.trim() ? cmsArticle.cover_alt.trim() : cmsArticle.title

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    ...(resolvedKeywords ? { keywords: resolvedKeywords } : {}),
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      publishedTime: cmsArticle.publish_date,
      // Only add an OG image when the Article genuinely has a Cover. When
      // absent, `images` is omitted so no route-specific og:image is emitted
      // (root metadata has no OG image either, so nothing is fabricated).
      ...(coverUrl ? { images: [{ url: coverUrl, alt: coverAlt }] } : {}),
    },
    // Next.js shallow-merges metadata: a route-level `twitter` object REPLACES
    // the root one wholesale (it does not deep-merge). So a route Twitter card
    // MUST restate card/title/description or they would be lost. We therefore
    // only introduce a route-level Twitter object when there is a Cover to add
    // — restating the root card type (summary_large_image) plus the resolved
    // CMS title/description. Without a Cover we add NO route Twitter object, so
    // the Article correctly inherits the root Twitter defaults unchanged. Root
    // has no site/creator handles, so none are fabricated here.
    ...(coverUrl
      ? {
          twitter: {
            card: "summary_large_image" as const,
            title: resolvedTitle,
            description: resolvedDescription,
            images: [{ url: coverUrl, alt: coverAlt }],
          },
        }
      : {}),
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // LEGACY-FIRST COEXISTENCE (STEP A6-A §2/§3): the six existing static
  // Blog articles remain authoritative for their own slugs. A CMS Article
  // must never shadow/replace a legacy slug, even on a slug collision — the
  // CMS Article is simply never looked up when a legacy match exists.
  const post = blogPosts.find((p) => p.slug === slug)
  if (post) {
    return <LegacyBlogPost slug={slug} post={post} />
  }

  // No legacy article for this slug — attempt the CMS Article read path.
  // getPublicCmsArticleBySlug() already enforces the full public visibility
  // contract (status + start_date/end_date, Asia/Taipei "today", inclusive
  // boundaries) with defense in depth, so a non-null result here is always
  // safe to render.
  const cmsArticle = await getPublicCmsArticleBySlug(slug)
  if (!cmsArticle) notFound()

  return <CmsBlogPost article={cmsArticle} />
}

function LegacyBlogPost({
  slug,
  post,
}: {
  slug: string
  post: (typeof blogPosts)[number]
}) {
  const content = blogContent[slug] ?? []
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3)

  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        datePublished={post.date}
        dateModified={post.date}
        image={post.image}
        author={post.author}
        url={`/blog/${post.slug}`}
      />
      <PageHero
        title={post.title}
        breadcrumbs={[
          { name: "首頁", href: "/" },
          { name: "驗屋知識", href: "/blog" },
          { name: post.category },
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-accent px-3 py-1 font-medium text-primary">{post.category}</span>
          <span className="text-muted-foreground">{formatDate(post.date)}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" />
            {post.readTime}
          </span>
          <span className="text-muted-foreground">{post.author}</span>
        </div>

        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
          <Image
            src={post.image || "/placeholder.svg"}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="(min-width: 768px) 768px, 100vw"
          />
        </div>

        <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>

        <div className="mt-8 space-y-10">
          {content.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-2xl font-bold text-primary">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((para, i) => (
                  <p key={i} className="leading-8 text-foreground">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-accent/40 p-6 text-center sm:p-8">
          <h3 className="font-serif text-xl font-bold text-primary">需要專業驗屋協助？</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            誠昕驗屋提供新成屋、中古屋與預售屋專業檢測服務。歡迎來電 {siteConfig.phone} 或加 LINE 諮詢。
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            立即預約驗屋
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary">
            <ArrowLeft className="size-4" />
            返回文章列表
          </Link>
        </div>
      </article>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-primary">延伸閱讀</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={p.image || "/placeholder.svg"}
                    alt={p.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="text-xs font-medium text-secondary">{p.category}</span>
                  <h3 className="mt-2 text-balance font-bold leading-snug text-primary">{p.title}</h3>
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

/**
 * First CMS-powered public Article view (STEP A6-A). Reuses the existing
 * legacy Blog article's visual language as much as practical, but is
 * intentionally minimal: no cover image (locked), no FAQ/related-article
 * sections (locked), no structured data (locked), and no author/read-time
 * (not part of the current Article CMS schema). `content_html` is rendered
 * ONLY through the shared <ArticleContent> component, which re-sanitizes
 * before using `dangerouslySetInnerHTML` — this route never renders raw HTML
 * or duplicates sanitizer logic itself.
 */
function CmsBlogPost({ article }: { article: PublicArticleDetail }) {
  // Same semantic fallback used by generateMetadata (STEP A6-B §9): trimmed
  // seo_description when non-empty, otherwise excerpt. No divergent contract.
  const resolvedDescription = article.seo_description?.trim() ? article.seo_description.trim() : article.excerpt ?? ""

  // STEP A7-D — Article JSON-LD image source: the trusted absolute public
  // `cover_image_url` ONLY, and only when present. undefined when the Article
  // has no Cover, so ArticleSchema omits the JSON-LD `image` entirely (never
  // "image": null / "" / a fabricated fallback). ArticleSchema recognizes this
  // as an absolute URL and emits it as-is (no siteConfig.url prepend).
  const coverImage = article.cover_image_url?.trim() ? article.cover_image_url.trim() : undefined

  return (
    <>
      <ArticleSchema
        title={article.title}
        description={resolvedDescription}
        datePublished={article.publish_date}
        {...(coverImage ? { image: coverImage } : {})}
        author="誠昕驗屋團隊"
        url={`/blog/${article.slug}`}
      />
      <BreadcrumbSchema
        items={[
          { name: "首頁", url: "/" },
          { name: "文章專區", url: "/blog" },
          { name: article.title, url: `/blog/${article.slug}` },
        ]}
      />
      <PageHero
        title={article.title}
        breadcrumbs={[
          { name: "首頁", href: "/" },
          { name: "驗屋知識", href: "/blog" },
          // Category is plain text only in this STEP — /blog/category/[slug]
          // does not exist yet, so it is never rendered as a link.
          ...(article.category_name ? [{ name: article.category_name }] : []),
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {article.category_name && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-accent px-3 py-1 font-medium text-primary">
              {article.category_name}
            </span>
          </div>
        )}

        {/* CMS Cover hero (STEP A7-C): rendered ONLY when the Article has a
            cover_image_url, in the same above-the-fold position and with the
            same aspect-[16/9] rounded frame the Legacy detail hero uses — so
            with-cover CMS Articles match the established visual language.
            When there is no cover, NOTHING is rendered here (no empty box,
            no reserved blank hero, no broken image, no 404 request), and the
            page keeps its current no-cover structure. The cover is visually
            associated with the Article and lives OUTSIDE content_html — it is
            never injected into the sanitized Rich Text body. `priority`
            matches the Legacy hero in this identical LCP slot. Alt = trimmed
            cover_alt, else the Article title (never "", "cover", "封面圖片"). */}
        {article.cover_image_url && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={article.cover_image_url || "/placeholder.svg"}
              alt={article.cover_alt?.trim() ? article.cover_alt.trim() : article.title}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        )}

        {article.excerpt && (
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}

        {/* NULL content_html is expected (Article body is optional) and must
            not crash or 404 — ArticleContent renders nothing for empty input. */}
        <ArticleContent html={article.content_html} className="mt-8 space-y-4 leading-8 text-foreground" />

        <div className="mt-12 rounded-2xl border border-border bg-accent/40 p-6 text-center sm:p-8">
          <h3 className="font-serif text-xl font-bold text-primary">需要專業驗屋協助？</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            誠昕驗屋提供新成屋、中古屋與預售屋專業檢測服務。歡迎來電 {siteConfig.phone} 或加 LINE 諮詢。
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            立即預約驗屋
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary">
            <ArrowLeft className="size-4" />
            返回文章列表
          </Link>
        </div>
      </article>

      <CtaSection />
    </>
  )
}
