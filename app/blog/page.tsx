import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Clock } from "lucide-react"
import { PageHero, CtaSection } from "@/components/shared"
import { blogPosts } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "驗屋知識文章",
  description:
    "誠昕驗屋分享驗屋知識、檢測儀器解析與購屋把關指南，協助您了解驗屋的重要性與各類房屋的檢測重點。",
  alternates: { canonical: "/blog" },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
}

export default function BlogPage() {
  const [featured, ...rest] = blogPosts

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

        {/* Rest */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={post.image || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 font-medium text-primary">{post.category}</span>
                  <span className="text-muted-foreground">{formatDate(post.date)}</span>
                </div>
                <h3 className="mt-3 text-balance font-bold leading-snug text-primary">{post.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                  閱讀全文
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
