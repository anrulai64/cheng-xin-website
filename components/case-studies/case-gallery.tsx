"use client"

import * as React from "react"
import Image from "next/image"
import { X } from "lucide-react"
import type { PublicCaseImage } from "@/lib/case-studies/queries"

/**
 * Public Case Study gallery (client component, no external dependency).
 *
 * Receives the ADDITIONAL gallery images only (the caller renders the first
 * image as the primary/cover). Renders a responsive grid and a lightweight,
 * dependency-free lightbox built on a fixed overlay + Escape/click-to-close.
 *
 * ALT priority is resolved by the caller-provided `caseName` fallback:
 *   image.alt_text -> caseName
 */
export function CaseGallery({
  images,
  caseName,
}: {
  images: PublicCaseImage[]
  caseName: string
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const close = React.useCallback(() => setActiveIndex(null), [])

  React.useEffect(() => {
    if (activeIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i === null ? i : (i + 1) % images.length))
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))
      }
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll while the lightbox is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [activeIndex, close, images.length])

  if (images.length === 0) return null

  const active = activeIndex === null ? null : images[activeIndex]

  return (
    <section aria-label="案例圖片集" className="mt-10">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`放大檢視圖片：${img.alt_text || caseName}`}
          >
            <Image
              src={img.public_url || "/placeholder.svg"}
              alt={img.alt_text || caseName}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt_text || caseName}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label="關閉"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <div
            className="relative max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.public_url || "/placeholder.svg"}
              alt={active.alt_text || caseName}
              width={1200}
              height={800}
              className="mx-auto max-h-[85vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </section>
  )
}
