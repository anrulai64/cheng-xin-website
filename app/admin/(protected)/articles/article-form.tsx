"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createArticle, updateArticle } from "./actions"
import { RichTextEditor } from "./rich-text-editor"

export type ArticleCategoryOption = {
  id: string
  name: string
}

// Initial values used to pre-fill the form in edit mode. Nullable DB fields
// are represented as `string | null` here — the caller passes the raw row
// shape and this component normalizes NULL to "" for each input.
export type ArticleInitialValues = {
  id: string
  title: string
  category_id: string
  slug: string
  status: string
  publish_date: string | null
  start_date: string | null
  end_date: string | null
  excerpt: string | null
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  content_html: string | null
}

const LIST_PATH = "/admin/articles"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已發布" },
  { value: "offline", label: "已下架" },
]

function getLocalToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function ArticleForm({
  mode,
  categories,
  initialValues,
}: {
  mode: "create" | "edit"
  categories: ArticleCategoryOption[]
  initialValues?: ArticleInitialValues
}) {
  const router = useRouter()

  const [title, setTitle] = React.useState(initialValues?.title ?? "")
  const [categoryId, setCategoryId] = React.useState(initialValues?.category_id ?? "")
  const [slug, setSlug] = React.useState(initialValues?.slug ?? "")
  const [status, setStatus] = React.useState(initialValues?.status ?? "draft")
  const [publishDate, setPublishDate] = React.useState(
    initialValues?.publish_date ?? (mode === "create" ? getLocalToday() : ""),
  )
  const [startDate, setStartDate] = React.useState(initialValues?.start_date ?? "")
  const [endDate, setEndDate] = React.useState(initialValues?.end_date ?? "")
  const [excerpt, setExcerpt] = React.useState(initialValues?.excerpt ?? "")
  const [contentHtml, setContentHtml] = React.useState(initialValues?.content_html ?? "")
  const [seoTitle, setSeoTitle] = React.useState(initialValues?.seo_title ?? "")
  const [seoKeywords, setSeoKeywords] = React.useState(initialValues?.seo_keywords ?? "")
  const [seoDescription, setSeoDescription] = React.useState(initialValues?.seo_description ?? "")

  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const errorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!error) return

    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    errorRef.current?.focus({ preventScroll: true })
  }, [error])

  const publicUrlPreview = slug.trim() ? `/blog/${slug.trim().toLowerCase()}` : "/blog/{slug}"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set("title", title)
    formData.set("category_id", categoryId)
    formData.set("slug", slug)
    formData.set("status", status)
    formData.set("publish_date", publishDate)
    formData.set("start_date", startDate)
    formData.set("end_date", endDate)
    formData.set("excerpt", excerpt)
    formData.set("content_html", contentHtml)
    formData.set("seo_title", seoTitle)
    formData.set("seo_keywords", seoKeywords)
    formData.set("seo_description", seoDescription)

    try {
      const result =
        mode === "create" ? await createArticle(formData) : await updateArticle(initialValues!.id, formData)

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push(LIST_PATH)
      router.refresh()
    } catch (err) {
      console.error("[v0] article form submit failed", err)
      setError("發生非預期的錯誤，請稍後再試。")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
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
            <Label htmlFor="title">
              <span className="text-destructive">＊</span>文章標題
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="請輸入文章標題"
              required
              aria-invalid={error?.includes("標題") ? true : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category_id">
              <span className="text-destructive">＊</span>文章分類
            </Label>
            <select
              id="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              aria-invalid={error?.includes("分類") ? true : undefined}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                請選擇分類
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">
              <span className="text-destructive">＊</span>Slug
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：home-inspection-checklist"
              required
              aria-invalid={error?.includes("Slug") ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              未來公開網址：<code className="font-mono">{publicUrlPreview}</code>
              。僅能使用小寫英文字母、數字與連字號（-）。
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">狀態</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-64"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish_date">
              <span className="text-destructive">＊</span>發布日期
            </Label>
            <Input
              id="publish_date"
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              required
              aria-invalid={error?.includes("發布日期") ? true : undefined}
              className="sm:w-64"
            />
            <p className="text-xs text-muted-foreground">此日期僅供編輯管理參考，不會影響文章的公開顯示時間。</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start_date">上線開始日期（選填）</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={error?.includes("開始日期") ? true : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end_date">下線日期（選填）</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={error?.includes("下線日期") ? true : undefined}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            公開顯示需同時符合「狀態為已發布」與「目前日期在上線/下線期間內」。
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excerpt">
              <span className="text-destructive">＊</span>文章摘要
            </Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="請輸入文章摘要"
              rows={3}
              required
              aria-invalid={error?.includes("摘要") ? true : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">文章內容</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <RichTextEditor value={contentHtml} onChange={setContentHtml} ariaLabel="文章內容編輯器" />
          <p className="text-xs text-muted-foreground">文章內容目前為選填，儲存後尚不會於公開網站顯示（此功能將於後續版本開放）。</p>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO 設定</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_title">SEO 標題</Label>
            <Input
              id="seo_title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="頁面標題（未填則使用預設）"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_keywords">SEO 關鍵字</Label>
            <Input
              id="seo_keywords"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="以逗號分隔的關鍵字"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seo_description">SEO 描述</Label>
            <Textarea
              id="seo_description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="頁面描述"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className={cn(buttonVariants({ size: "lg" }))}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              處理中...
            </>
          ) : (
            "儲存"
          )}
        </button>
        <Link href={LIST_PATH} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          取消
        </Link>
      </div>
    </form>
  )
}
