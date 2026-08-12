import Image from "next/image"
import Link from "next/link"
import { Phone, MessageCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-data"

const points = ["專業檢測儀器", "詳細圖文報告", "豐富驗屋經驗"]

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-accent/40">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
        <div>
          <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            桃園・台北・新北・新竹 專業驗屋團隊
          </span>
          <h1 className="mt-5 text-balance font-serif text-4xl font-bold leading-tight text-primary sm:text-5xl lg:text-6xl">
            專業驗屋，<br className="hidden sm:block" />守護您的購屋品質
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            提供桃園、台北、新北、新竹專業驗屋服務，協助您掌握房屋品質，安心交屋。
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 text-secondary" />
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/contact">
                <Phone className="size-5" />
                立即預約驗屋
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              <a href={siteConfig.line} target="_blank" rel="noreferrer">
                <MessageCircle className="size-5" />
                LINE 免費諮詢
              </a>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl shadow-xl shadow-primary/10">
            <Image
              src="/hero-inspection.png"
              alt="專業驗屋師使用熱顯像儀檢測房屋"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-border bg-card p-4 shadow-lg sm:block lg:-left-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-primary">100%</span>
                <span className="text-xs text-muted-foreground">數據化檢測報告</span>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-primary">4 大</span>
                <span className="text-xs text-muted-foreground">服務縣市</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
