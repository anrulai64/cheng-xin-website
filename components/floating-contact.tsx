"use client"

import { Phone, MessageCircle } from "lucide-react"
import { siteConfig } from "@/lib/site-data"

export function FloatingContact() {
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      <a
        href={siteConfig.line}
        target="_blank"
        rel="noreferrer"
        aria-label="LINE 線上諮詢"
        className="flex size-13 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30 transition-transform hover:scale-105 sm:size-14"
      >
        <MessageCircle className="size-6" />
      </a>
      <a
        href={`tel:${siteConfig.phoneRaw}`}
        aria-label="電話諮詢"
        className="flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 sm:size-14"
      >
        <Phone className="size-6" />
      </a>
    </div>
  )
}
