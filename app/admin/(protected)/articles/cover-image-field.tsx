"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ImageOff, Loader2, Trash2, Upload } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ARTICLE_COVER_ALLOWED_TYPES,
  ARTICLE_COVER_MAX_FILE_SIZE,
} from "@/lib/admin/articles/cover-image"
import { removeArticleCoverImage, uploadArticleCoverImage } from "./cover-actions"

/**
 * Article Cover Image Admin field (STEP A7-B2 — full upload/replace/remove).
 *
 * SECURITY / CONTRACT:
 *   - Storage mutation happens EXCLUSIVELY through the two server actions
 *     (uploadArticleCoverImage / removeArticleCoverImage). This client NEVER
 *     calls supabase.storage.* directly and never submits a path, URL, bucket,
 *     or filename — only `article_id` + `file` (upload) or `article_id`
 *     (remove). cover_image_url / cover_image_path are 100% server-generated.
 *   - `coverImageUrl` is DISPLAY-ONLY (read-only preview). It is refreshed by
 *     router.refresh() re-running the Edit page SELECT, never by faking DB
 *     state on the client.
 *   - cover_alt stays a normal controlled input persisted by the ArticleForm
 *     submit (unchanged from A7-A).
 *
 * MODE:
 *   - "edit": real upload / replace / remove (Article id exists).
 *   - "create": NO upload — the object path needs the Article id, which does
 *     not exist until the row is created. Shows guidance to save first, then
 *     upload from the Edit page. cover_alt input still works.
 *
 * The client-side accept + size/type pre-checks are UX only; the server
 * validation in cover-actions.ts is authoritative.
 */
export function CoverImageField({
  mode,
  articleId,
  coverImageUrl,
  alt,
  onAltChange,
}: {
  mode: "create" | "edit"
  articleId: string | null
  coverImageUrl: string | null
  alt: string
  onAltChange: (value: string) => void
}) {
  const router = useRouter()
  const hasImage = typeof coverImageUrl === "string" && coverImageUrl.trim() !== ""

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState<null | "upload" | "remove">(null)
  const [coverError, setCoverError] = React.useState<string | null>(null)
  const [coverNotice, setCoverNotice] = React.useState<string | null>(null)

  const acceptAttr = ARTICLE_COVER_ALLOWED_TYPES.join(",")
  const isEdit = mode === "edit" && typeof articleId === "string" && articleId.trim() !== ""

  function resetFileInput() {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setCoverError(null)
    setCoverNotice(null)
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setSelectedFile(null)
      return
    }
    // UX-only pre-checks (server validation remains authoritative).
    if (!ARTICLE_COVER_ALLOWED_TYPES.includes(file.type as (typeof ARTICLE_COVER_ALLOWED_TYPES)[number])) {
      setSelectedFile(null)
      setCoverError("圖片格式不支援，請改用 JPG / PNG / WebP / GIF / AVIF。")
      return
    }
    if (file.size <= 0) {
      setSelectedFile(null)
      setCoverError("請選擇有效的圖片檔案。")
      return
    }
    if (file.size > ARTICLE_COVER_MAX_FILE_SIZE) {
      setSelectedFile(null)
      setCoverError("圖片超過 8 MB 上限，請壓縮後再上傳。")
      return
    }
    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!isEdit || !selectedFile || busy) return
    setCoverError(null)
    setCoverNotice(null)
    setBusy("upload")
    try {
      const fd = new FormData()
      fd.set("article_id", articleId!.trim())
      fd.set("file", selectedFile)
      const result = await uploadArticleCoverImage(fd)
      if (!result.ok) {
        // On failure keep the old preview and let the admin retry / reselect.
        setCoverError(result.error)
        return
      }
      resetFileInput()
      setCoverNotice("封面圖片已更新。")
      router.refresh()
    } catch (err) {
      console.error("[v0] cover upload failed", err)
      setCoverError("發生非預期的錯誤，請稍後再試。")
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove() {
    if (!isEdit || busy) return
    setCoverError(null)
    setCoverNotice(null)
    setBusy("remove")
    try {
      const fd = new FormData()
      fd.set("article_id", articleId!.trim())
      const result = await removeArticleCoverImage(fd)
      if (!result.ok) {
        setCoverError(result.error)
        return
      }
      resetFileInput()
      setCoverNotice("封面圖片已移除。")
      router.refresh()
    } catch (err) {
      console.error("[v0] cover remove failed", err)
      setCoverError("發生非預期的錯誤，請稍後再試。")
    } finally {
      setBusy(null)
    }
  }

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
      </div>

      {coverError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{coverError}</span>
        </div>
      ) : null}

      {coverNotice ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          {coverNotice}
        </div>
      ) : null}

      {isEdit ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cover_file">{hasImage ? "更換封面圖片" : "上傳封面圖片"}</Label>
            <Input
              ref={fileInputRef}
              id="cover_file"
              type="file"
              accept={acceptAttr}
              onChange={handleSelect}
              disabled={busy !== null}
            />
            <p className="text-xs text-muted-foreground">
              支援 JPG / PNG / WebP / GIF / AVIF，單張上限 8 MB。不支援 SVG。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || busy !== null}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {busy === "upload" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  上傳中...
                </>
              ) : (
                <>
                  <Upload className="size-4" aria-hidden="true" />
                  {hasImage ? "更換封面" : "上傳封面"}
                </>
              )}
            </button>

            {hasImage ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy !== null}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {busy === "remove" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    移除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" aria-hidden="true" />
                    移除封面
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          請先建立文章，再進入編輯頁上傳封面圖片。
        </div>
      )}

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
          替代文字為純文字，於畫面無法載入圖片或供螢幕閱讀器使用時顯示。
        </p>
      </div>
    </div>
  )
}
