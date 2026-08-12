import Link from "next/link"
import { Phone, Mail, MapPin, MessageCircle, ShieldCheck } from "lucide-react"
import { siteConfig, services, serviceAreas } from "@/lib/site-data"

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary-foreground/10">
                <ShieldCheck className="size-5" />
              </span>
              <span className="font-serif text-lg font-bold">{siteConfig.name}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
              專業驗屋，守護您的購屋品質。提供桃園、台北、新北、新竹專業驗屋服務。
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold">快速連結</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/70">
              {[
                { name: "關於我們", href: "/about" },
                { name: "驗屋實績", href: "/case-studies" },
                { name: "驗屋知識", href: "/blog" },
                { name: "常見問題", href: "/faq" },
                { name: "聯絡我們", href: "/contact" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-primary-foreground">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold">服務項目</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/70">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="transition-colors hover:text-primary-foreground">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas */}
          <div>
            <h3 className="text-sm font-semibold">服務區域</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/70">
              {serviceAreas.map((a) => (
                <li key={a.slug}>
                  <Link href={`/service-areas/${a.slug}`} className="transition-colors hover:text-primary-foreground">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-sm font-semibold">聯絡資訊</h3>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>{siteConfig.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0" />
                <a href={`tel:${siteConfig.phoneRaw}`} className="hover:text-primary-foreground">
                  {siteConfig.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0" />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-primary-foreground">
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="size-4 shrink-0" />
                <a href={siteConfig.line} target="_blank" rel="noreferrer" className="hover:text-primary-foreground">
                  LINE：{siteConfig.lineId}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/60 sm:flex-row">
          <p>
            © {year} {siteConfig.name}（{siteConfig.nameEn}）. 版權所有.
          </p>
          <p>專業驗屋服務｜桃園・台北・新北・新竹</p>
        </div>
      </div>
    </footer>
  )
}
