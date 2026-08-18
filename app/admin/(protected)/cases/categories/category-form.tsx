"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { siteConfig } from "@/lib/site-data"
import { slugify } from "@/lib/admin/cases/slug"
import { createCategory, updateCategory } from "./actions"

type CategoryValues = {
  id: string
  name: string
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  head_code: string | null
  slug: string | null
  image_url: string | null
}

const LIST_PATH = "/admin/cases/categories"

export function CategoryForm({
  mode,
  category,
}: {
  mode: "create" | "edit"
  category?: CategoryValues
}) {
  const router = useRouter()

  const [name, setName] = React.useState(category?.name ?? "")
  const [slug, setSlug] = React.useState(category?.slug ?? "")
  const [seoTitle, setSeoTitle] = React.useState(category?.seo_title ?? "")
  const [seoKeywords, setSeoKeywords] = React.useState(category?.seo_keywords ?? "")
  const [seoDescription, setSeoDescription] = React.useState(category?.seo_description ?? "")
  const [headCode, setHeadCode] = React.useState(category?.head_code ?? "")

  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Local object-URL preview for a newly picked file; revoked on change/unmount.
  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // The public URL preview: use the entered slug, else preview what would be
  // generated from the name (may be empty for pure-Chinese names).
  const effectiveSlug = slug.trim() || slugify(name)
  const publicUrl = effectiveSlug
    ? `${siteConfig.url}/case-studies/category/${effectiveSlug}`
    : ""

  async function handleCopy() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("複製失敗，請手動複製網址。")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set("name", name)
    formData.set("slug", slug)
    formData.set("seo_title", seoTitle)
    formData.set("seo_keywords", seoKeywords)
    formData.set("seo_description", seoDescription)
    formData.set("head_code", headCode)
    if (file) formData.set("image", file)

    try {
      const result =
        mode === "create"
          ? await createCategory(formData)
          : await updateCategory(category!.id, formData)

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push(LIST_PATH)
      router.refresh()
    } catch (err) {
      console.error("[v0] category form submit failed", err)
      setError("發生非預期的錯誤，請稍後再試。")
      setLoading(false)
    }
  }

  const shownImage = previewUrl ?? category?.image_url ?? null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Basic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本設定</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              <span className="text-destructive">＊</span>選項名稱
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入分類名稱"
              required
              aria-invalid={error?.includes("選項名稱") ? true : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO 設定</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_title">TITLE</Label>
            <Input
              id="seo_title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="頁面標題（未填則使用預設）"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_keywords">KEYWORD</Label>
            <Input
              id="seo_keywords"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="以逗號分隔的關鍵字"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_description">DESCRIPTION</Label>
            <Textarea
              id="seo_description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="頁面描述"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="head_code">Head 嵌入碼</Label>
            <Textarea
              id="head_code"
              value={headCode}
              onChange={(e) => setHeadCode(e.target.value)}
              placeholder="貼上要嵌入 <head> 的追蹤碼或標籤"
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自訂網址</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">網址代稱（slug）</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：new-house（可留空，中文名稱請手動輸入）"
            />
            <p className="text-xs text-muted-foreground">
              僅能使用小寫英文、數字與連字號（-）。留空時會嘗試由名稱自動產生。
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>公開網址預覽</Label>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                {publicUrl || "（尚未設定網址）"}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!publicUrl}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "已複製" : "複製網址"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">圖片</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownImage || "/placeholder.svg"}
              alt="分類圖片預覽"
              className="h-40 w-auto rounded-lg border object-cover"
            />
          ) : (
            <p className="text-sm text-muted-foreground">尚未上傳圖片。</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image">
              {category?.image_url ? "更換圖片" : "上傳圖片"}
            </Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">僅支援圖片格式，單檔上限 8MB。</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className={cn(buttonVariants({ size: "lg" }))}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              處理中...
            </>
          ) : (
            "送出"
          )}
        </button>
        <Link href={LIST_PATH} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          取消
        </Link>
      </div>
    </form>
  )
}
