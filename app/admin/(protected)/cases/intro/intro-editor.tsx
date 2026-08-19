"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { RichTextEditor } from "../rich-text-editor"
import { saveCaseIntroContent } from "./actions"

/**
 * Singleton editor for the shared Case Study intro content (「案例介紹文字」).
 * Reuses the STEP 8 RichTextEditor. No `caseId` is passed, so inline image
 * upload is intentionally disabled for this shared/global content (there is no
 * per-case storage folder for it, and we must not invent a bucket/path).
 */
export function IntroEditor({ initialHtml }: { initialHtml: string }) {
  const [html, setHtml] = React.useState(initialHtml)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const fd = new FormData()
      fd.set("content_html", html)
      const result = await saveCaseIntroContent(fd)
      if (!result.ok) {
        setError(result.error)
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      setSuccess("案例介紹文字已儲存。")
    } catch (err) {
      console.error("[v0] save case intro content failed", err)
      setError("儲存時發生非預期錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          {success}
        </div>
      ) : null}

      <RichTextEditor
        value={html}
        onChange={setHtml}
        ariaLabel="案例介紹文字"
        minHeightClass="min-h-[24rem]"
      />

      <p className="text-xs text-muted-foreground">
        此為共用內容，會套用於前台案例區塊（例如「案例介紹」「常見問題」等）。
        內文圖片上傳在此頁暫不開放；文字與 HTML 編輯不受影響。
      </p>

      <div>
        <button type="submit" disabled={loading} className={cn(buttonVariants({ size: "lg" }))}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              儲存中…
            </>
          ) : (
            "儲存"
          )}
        </button>
      </div>
    </form>
  )
}
