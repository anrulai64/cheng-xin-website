import type { Metadata } from "next"
import { PageHero, CtaSection } from "@/components/shared"
import { FaqAccordion } from "@/components/faq-accordion"
import { FaqSchema } from "@/components/structured-data"
import { faqs } from "@/lib/site-data"

export const metadata: Metadata = {
  title: "常見問題",
  description:
    "關於驗屋時間、費用、報告與缺失處理的常見問題解答。誠昕驗屋為您解答驗屋前後的各種疑問，讓您安心委託。",
  alternates: { canonical: "/faq" },
}

export default function FaqPage() {
  return (
    <>
      <FaqSchema faqs={faqs} />
      <PageHero
        title="常見問題"
        description="整理購屋者在驗屋前後最常詢問的問題，若仍有疑問，歡迎直接與我們聯繫。"
        breadcrumbs={[{ name: "首頁", href: "/" }, { name: "常見問題" }]}
      />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <FaqAccordion items={faqs} />
      </section>

      <CtaSection />
    </>
  )
}
