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
import { createCategory, updateCategory } from "./actions"

type CategoryValues = {
  id: string
  name: string
  slug: string
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
}

const LIST_PATH = "/admin/articles/categories"

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

  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const publicUrlPreview = slug.trim() ? `/blog/category/${slug.trim().toLowerCase()}` : "/blog/category/{slug}"

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

    try {
      const result =
        mode === "create" ? await createCategory(formData) : await updateCategory(category!.id, formData)

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push(LIST_PATH)
      router.refresh()
    } catch (err) {
      console.error("[v0] article category form submit failed", err)
      setError("發生非預期的錯誤，請稍後再試。")
      setLoading(false)
    }
  }

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
              <span className="text-destructive">＊</span>分類名稱
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入分類名稱"
              required
              aria-invalid={error?.includes("分類名稱") ? true : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">
              <span className="text-destructive">＊</span>Slug
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：home-inspection"
              required
              aria-invalid={error?.includes("Slug") ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              未來公開網址：<code className="font-mono">{publicUrlPreview}</code>
              。僅能使用小寫英文字母、數字與連字號（-）；變更 Slug 會影響未來的分類網址。
            </p>
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
