"use client"

import * as React from "react"
import Image from "next/image"
import { X } from "lucide-react"
import type { PublicCaseImage } from "@/lib/case-studies/queries"

/**
 * Public Case Study gallery (client component, no external dependency).
 *
 * Receives the FULL gallery array (order exactly as returned by
 * getPublicCaseGallery: sort_order ASC, created_at ASC). Presents a large
 * "current" image with a thumbnail navigation row, plus the existing
 * dependency-free lightbox (click-to-enlarge, X/backdrop/Escape to close,
 * ArrowLeft/ArrowRight to navigate, background scroll lock).
 *
 * Selected-image state lives here (single owner). The lightbox opens on the
 * currently selected image and, when navigated, keeps the large image synced
 * so closing leaves the last-viewed image selected.
 *
 * ALT priority: image.alt_text -> caseName. storage_path is never exposed.
 */
export function CaseGallery({
  images,
  caseName,
}: {
  images: PublicCaseImage[]
  caseName: string
}) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  const hasImages = images.length > 0
  const hasThumbs = images.length > 1
  // Guard against an out-of-range index if the set ever changes.
  const safeIndex = hasImages ? Math.min(selectedIndex, images.length - 1) : 0
  const current = hasImages ? images[safeIndex] : null

  const close = React.useCallback(() => setLightboxOpen(false), [])

  React.useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") {
        setSelectedIndex((i) => (i + 1) % images.length)
      }
      if (e.key === "ArrowLeft") {
        setSelectedIndex((i) => (i - 1 + images.length) % images.length)
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
  }, [lightboxOpen, close, images.length])

  // Zero images: keep the existing placeholder behavior. No thumbnail row, no
  // lightbox trigger, no empty container beyond the stable image area.
  if (!hasImages) {
    return (
      <div className="mt-8 overflow-hidden rounded-2xl">
        <Image
          src="/placeholder.svg"
          alt={caseName}
          width={896}
          height={504}
          className="w-full object-cover"
        />
      </div>
    )
  }

  return (
    <section aria-label="案例圖片" className="mt-8">
      {/* Large current image — clickable/keyboard-accessible lightbox trigger. */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`放大檢視案例圖片：${current?.alt_text || caseName}`}
        className="group relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image
          src={current?.public_url || "/placeholder.svg"}
          alt={current?.alt_text || caseName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </button>

      {/* Thumbnail navigation — only when 2+ images. Horizontal scroll row. */}
      {hasThumbs && (
        <ul
          className="mt-4 flex gap-3 overflow-x-auto pb-1"
          role="list"
          aria-label="案例圖片縮圖導覽"
        >
          {images.map((img, i) => {
            const selected = i === safeIndex
            return (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  aria-label={`查看第 ${i + 1} 張案例圖片`}
                  aria-current={selected ? "true" : undefined}
                  className={`relative block aspect-[4/3] w-20 overflow-hidden rounded-lg border bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-24 ${
                    selected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={img.public_url || "/placeholder.svg"}
                    alt={img.alt_text || caseName}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {lightboxOpen && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt_text || caseName}
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
              src={current.public_url || "/placeholder.svg"}
              alt={current.alt_text || caseName}
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
