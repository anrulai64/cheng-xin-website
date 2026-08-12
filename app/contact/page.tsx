import type { Metadata } from "next"
import { Phone, MessageCircle, Mail, MapPin, Clock } from "lucide-react"
import { PageHero } from "@/components/shared"
import { ContactForm } from "@/components/contact-form"
import { siteConfig } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "聯絡我們",
  description:
    "預約驗屋或諮詢服務，歡迎來電、加入官方 LINE 或填寫線上表單。誠昕驗屋提供桃園、台北、新北、新竹地區專業驗屋服務。",
  alternates: { canonical: "/contact" },
}

const contactItems = [
  { icon: Phone, label: "服務專線", value: siteConfig.phone, href: `tel:${siteConfig.phoneRaw}` },
  { icon: MessageCircle, label: "官方 LINE", value: siteConfig.lineId, href: siteConfig.line },
  { icon: Mail, label: "電子信箱", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { icon: MapPin, label: "服務據點", value: siteConfig.address },
  { icon: Clock, label: "服務時間", value: "週一至週日 09:00 - 21:00" },
]

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="聯絡我們"
        description="準備預約驗屋或有任何疑問？歡迎透過以下方式與誠昕驗屋聯繫，我們將盡快為您服務。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "聯絡我們" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-serif text-2xl font-bold text-primary">聯絡資訊</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              歡迎透過電話或 LINE 與我們即時聯繫，或填寫右側表單，我們會盡快回覆。
            </p>
            <ul className="mt-8 space-y-5">
              {contactItems.map((item) => {
                const Icon = item.icon
                const content = (
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-0.5 font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                )
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                        className="block rounded-xl transition-colors hover:bg-muted/60"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-primary">線上諮詢</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              填寫以下表單，留下您的需求與聯絡方式，我們將盡快與您聯繫安排驗屋。
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
