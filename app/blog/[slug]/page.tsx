import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Clock, ArrowLeft, ArrowRight } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { ArticleSchema } from "@/components/structured-data"
import { blogPosts, blogContent, siteConfig } from "@/lib/site-data"

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) return {}
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) notFound()

  const content = blogContent[slug] ?? []
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3)

  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        date={post.date}
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
