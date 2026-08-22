"use client"

import * as React from "react"
import { ImageOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Article Cover Image Admin FOUNDATION (STEP A7-A).
 *
 * SCOPE — intentionally NOT a full upload widget:
 *   - Shows the CURRENT cover image (read-only preview) when a
 *     cover_image_url already exists on the Article, otherwise a clear
 *     "no image" state.
 *   - Provides the cover_alt editing input (plain text).
 *   - Deliberately renders NO file input and triggers NO Storage mutation.
 *     Real upload / replace / remove lifecycle is A7-B.
 *
 * SECURITY:
 *   - `coverImageUrl` is DISPLAY-ONLY. It is passed down from a server
 *     component (the Edit page SELECT) and is never turned into a
 *     client-editable field, so the client can never submit an arbitrary
 *     cover_image_url for persistence. Only cover_alt is a controlled input.
 *   - Preview uses a plain <img>, not next/image, so this foundation does
 *     not depend on (or force any change to) the public image config
 *     (next.config images / remotePatterns). Admin-only, behind auth.
 */
export function CoverImageField({
  coverImageUrl,
  alt,
  onAltChange,
}: {
  coverImageUrl: string | null
  alt: string
  onAltChange: (value: string) => void
}) {
  const hasImage = typeof coverImageUrl === "string" && coverImageUrl.trim() !== ""

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">目前封面圖片</span>
        {hasImage ? (
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            {/* Plain <img>: Admin-only preview, no next/image dependency. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl! || "/placeholder.svg"}
              alt={alt.trim() !== "" ? alt : "文章封面圖片預覽"}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <p className="text-sm">尚未設定封面圖片</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          封面圖片的上傳與更換功能將於後續版本開放，此處目前僅顯示現有封面。
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cover_alt">封面圖片替代文字（選填）</Label>
        <Input
          id="cover_alt"
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="用於無障礙與 SEO 的圖片描述"
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground">
          替代文字為純文字，於畫面無法載入圖片或供螢幕閱讀器使用時顯示，可先行填寫。
        </p>
      </div>
    </div>
  )
}
