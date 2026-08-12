"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone, Menu, X, ChevronDown, MessageCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { siteConfig, services, serviceAreas } from "@/lib/site-data"

const mainNav = [
  { name: "首頁", href: "/" },
  { name: "關於我們", href: "/about" },
  { name: "服務項目", href: "/services", mega: "services" },
  { name: "服務區域", href: "/service-areas", mega: "areas" },
  { name: "驗屋實績", href: "/case-studies" },
  { name: "驗屋知識", href: "/blog" },
  { name: "常見問題", href: "/faq" },
  { name: "聯絡我們", href: "/contact" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMega, setOpenMega] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          : "border-transparent bg-background"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 lg:h-20">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} 首頁`}>
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground lg:size-10">
            <ShieldCheck className="size-5 lg:size-6" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold tracking-wide text-primary lg:text-xl">
              {siteConfig.name}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Home Inspection
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setOpenMega(null)}>
          {mainNav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setOpenMega(item.mega ?? null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                    active ? "text-primary" : "text-foreground/80"
                  )}
                >
                  {item.name}
                  {item.mega && <ChevronDown className="size-3.5 opacity-60" />}
                </Link>

                {item.mega === "services" && openMega === "services" && (
                  <MegaPanel>
                    {services.map((s) => (
                      <MegaLink
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        title={s.name}
                        desc={s.shortDesc}
                      />
                    ))}
                  </MegaPanel>
                )}
                {item.mega === "areas" && openMega === "areas" && (
                  <MegaPanel>
                    {serviceAreas.map((a) => (
                      <MegaLink
                        key={a.slug}
                        href={`/service-areas/${a.slug}`}
                        title={a.title}
                        desc={`${a.name}地區專業驗屋服務`}
                      />
                    ))}
                  </MegaPanel>
                )}
              </div>
            )
          })}
        </nav>

        {/* CTA buttons */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`tel:${siteConfig.phoneRaw}`}>
              <Phone className="size-4" />
              立即來電
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <a href={siteConfig.line} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              LINE 諮詢
            </a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="開啟選單"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-4">
            <ul className="flex flex-col">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block border-b border-border/60 py-3 text-base font-medium text-foreground"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href={`tel:${siteConfig.phoneRaw}`}>
                  <Phone className="size-4" />
                  立即來電 {siteConfig.phone}
                </a>
              </Button>
              <Button asChild className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <a href={siteConfig.line} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  LINE 免費諮詢
                </a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function MegaPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-full z-50 pt-2">
      <div className="grid w-[420px] grid-cols-1 gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg">
        {children}
      </div>
    </div>
  )
}

function MegaLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
    >
      <div className="text-sm font-semibold text-foreground group-hover:text-primary">{title}</div>
      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>
    </Link>
  )
}
