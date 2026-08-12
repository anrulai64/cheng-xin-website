"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { services } from "@/lib/site-data"

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // 本表單為前端示範，實際送出可串接後端或表單服務
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <Check className="size-7" />
        </span>
        <h3 className="mt-5 font-serif text-2xl font-bold text-primary">已收到您的諮詢</h3>
        <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
          感謝您的來信，我們將盡快與您聯繫。若需即時諮詢，歡迎直接來電或加入官方 LINE。
        </p>
        <Button className="mt-6" onClick={() => setSubmitted(false)}>
          再填一筆
        </Button>
      </div>
    )
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
            姓名 <span className="text-primary">*</span>
          </label>
          <input id="name" name="name" required className={inputClass} placeholder="您的姓名" />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
            聯絡電話 <span className="text-primary">*</span>
          </label>
          <input id="phone" name="phone" type="tel" required className={inputClass} placeholder="0900-000-000" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            電子信箱
          </label>
          <input id="email" name="email" type="email" className={inputClass} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="service" className="mb-1.5 block text-sm font-medium text-foreground">
            諮詢服務項目
          </label>
          <select id="service" name="service" className={inputClass} defaultValue="">
            <option value="" disabled>
              請選擇服務項目
            </option>
            {services.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value="其他">其他諮詢</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
          諮詢內容
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className={inputClass}
          placeholder="請簡述您的房屋類型、坪數、地區與希望驗屋的時間，方便我們為您安排。"
        />
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto">
        送出諮詢
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        送出即表示您同意我們透過所留電話或信箱與您聯繫。我們僅將資料用於驗屋諮詢用途。
      </p>
    </form>
  )
}
