import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ScanLine, FileText, Award, Headset, Thermometer, Ruler, Droplets, Zap,
  Droplet, LayoutGrid, Grid3x3, DoorOpen, Waves, Plug,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { siteConfig } from "@/lib/site-data"

export const iconMap: Record<string, LucideIcon> = {
  ScanLine, FileText, Award, Headset, Thermometer, Ruler, Droplets, Zap,
  Droplet, LayoutGrid, Grid3x3, DoorOpen, Waves, Plug,
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: "center" | "left"
  className?: string
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-pretty font-serif text-3xl font-bold text-primary sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

export function CtaSection({
  title = "立即預約專業驗屋，安心交屋第一步",
  description = "無論是新成屋、中古屋或預售屋，誠昕驗屋都能為您把關。歡迎來電或加 LINE 免費諮詢。",
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <h2 className="text-balance font-serif text-3xl font-bold text-primary-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-primary-foreground/80">
          {description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <a href={siteConfig.line} target="_blank" rel="noreferrer">
              <MessageCircle className="size-5" />
              LINE 免費諮詢
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="gap-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href={`tel:${siteConfig.phoneRaw}`}>
              <Phone className="size-5" />
              {siteConfig.phone}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="麵包屑" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-primary">
                {item.name}
              </Link>
            ) : (
              <span className="text-foreground">{item.name}</span>
            )}
            {i < items.length - 1 && <span className="text-muted-foreground/50">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHero({
  title,
  description,
  breadcrumbs,
}: {
  title: string
  description?: string
  breadcrumbs?: { name: string; href?: string }[]
}) {
  return (
    <section className="border-b border-border bg-accent/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {breadcrumbs && (
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <h1 className="text-balance font-serif text-3xl font-bold text-primary sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </section>
  )
}
