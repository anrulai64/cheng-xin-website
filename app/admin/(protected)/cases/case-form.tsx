"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Check, Copy, ImagePlus, Loader2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { siteConfig } from "@/lib/site-data"
import { slugify } from "@/lib/admin/cases/slug"
import { isHtmlContentEmpty } from "@/lib/admin/cases/html"
import { createCase, updateCase } from "./actions"
import { RichTextEditor } from "./rich-text-editor"
import { RelatedCaseSelector, type CandidateCase } from "./related-case-selector"

export type CategoryOption = { id: string; name: string }

export type CaseValues = {
  id: string
  category_id: string
  name: string
  short_description: string | null
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  head_code: string | null
  slug: string | null
  price: number | null
  original_price: number | null
  is_home: boolean
  is_new: boolean
  is_hot: boolean
  is_recommended: boolean
  publish_start: string | null
  publish_end: string | null
  status: string
  description_html: string | null
  detail_html: string | null
  note: string | null
  case_code: string
  stock_quantity: number | null
  safety_stock: number | null
  shipping_rule: string | null
  location: string | null
  property_type: string | null
  property_condition: string | null
  floor_area: string | null
  layout: string | null
}

const LIST_PATH = "/admin/cases"

const STATUS_OPTIONS = [
  { value: "sale", label: "銷售" },
  { value: "display", label: "展示" },
  { value: "offline", label: "下架" },
]

// A small set of common shipping rules kept schema-compatible (plain text).
// Free text is still allowed via the "其他" option's input.
const SHIPPING_PRESETS = ["", "宅配", "貨到付款", "自行取貨", "來電洽詢"]

/** Convert a stored ISO timestamp to a value usable by <input type=date>. */
function toDateInput(iso: string | null): string {
  if (!iso) return ""
  // Accept both full ISO and plain YYYY-MM-DD.
  return iso.slice(0, 10)
}

function Req() {
  return <span className="text-destructive">＊</span>
}

export function CaseForm({
  mode,
  categories,
  caseItem,
  relatedCandidates = [],
}: {
  mode: "create" | "edit"
  categories: CategoryOption[]
  caseItem?: CaseValues
  /**
   * Candidate cases for the create-page 相關案例 picker. Only used in create
   * mode; the edit page manages related cases through its own dedicated
   * RelatedCaseManager and does not pass this prop.
   */
  relatedCandidates?: CandidateCase[]
}) {
  const router = useRouter()

  const [categoryId, setCategoryId] = React.useState(caseItem?.category_id ?? "")
  const [name, setName] = React.useState(caseItem?.name ?? "")
  const [shortDescription, setShortDescription] = React.useState(
    caseItem?.short_description ?? "",
  )
  const [location, setLocation] = React.useState(caseItem?.location ?? "")
  // 案例基本資料 (free-text): 類別 / 屋況 / 坪數 / 格局.
  const [propertyType, setPropertyType] = React.useState(caseItem?.property_type ?? "")
  const [propertyCondition, setPropertyCondition] = React.useState(
    caseItem?.property_condition ?? "",
  )
  const [floorArea, setFloorArea] = React.useState(caseItem?.floor_area ?? "")
  const [layout, setLayout] = React.useState(caseItem?.layout ?? "")

  const [seoTitle, setSeoTitle] = React.useState(caseItem?.seo_title ?? "")
  const [seoKeywords, setSeoKeywords] = React.useState(caseItem?.seo_keywords ?? "")
  const [seoDescription, setSeoDescription] = React.useState(caseItem?.seo_description ?? "")
  const [headCode, setHeadCode] = React.useState(caseItem?.head_code ?? "")
  const [slug, setSlug] = React.useState(caseItem?.slug ?? "")

  const [price, setPrice] = React.useState(
    caseItem?.price != null ? String(caseItem.price) : "",
  )
  const [originalPrice, setOriginalPrice] = React.useState(
    caseItem?.original_price != null ? String(caseItem.original_price) : "",
  )

  const [isHome, setIsHome] = React.useState(caseItem?.is_home ?? false)
  const [isNew, setIsNew] = React.useState(caseItem?.is_new ?? false)
  const [isHot, setIsHot] = React.useState(caseItem?.is_hot ?? false)
  const [isRecommended, setIsRecommended] = React.useState(caseItem?.is_recommended ?? false)

  const [publishStart, setPublishStart] = React.useState(toDateInput(caseItem?.publish_start ?? null))
  const [publishEnd, setPublishEnd] = React.useState(toDateInput(caseItem?.publish_end ?? null))

  const [status, setStatus] = React.useState(caseItem?.status ?? "display")

  const [caseCode, setCaseCode] = React.useState(caseItem?.case_code ?? "")

  const [stockQuantity, setStockQuantity] = React.useState(
    caseItem?.stock_quantity != null ? String(caseItem.stock_quantity) : "",
  )
  const [safetyStock, setSafetyStock] = React.useState(
    caseItem?.safety_stock != null ? String(caseItem.safety_stock) : "",
  )

  // Shipping rule: if the stored value matches a preset, use the select;
  // otherwise treat it as custom free text.
  const initialShipping = caseItem?.shipping_rule ?? ""
  const initialIsPreset = SHIPPING_PRESETS.includes(initialShipping)
  const [shippingMode, setShippingMode] = React.useState<"preset" | "custom">(
    initialShipping && !initialIsPreset ? "custom" : "preset",
  )
  const [shippingPreset, setShippingPreset] = React.useState(
    initialIsPreset ? initialShipping : "",
  )
  const [shippingCustom, setShippingCustom] = React.useState(
    initialShipping && !initialIsPreset ? initialShipping : "",
  )

  const [descriptionHtml, setDescriptionHtml] = React.useState(caseItem?.description_html ?? "")
  const [detailHtml, setDetailHtml] = React.useState(caseItem?.detail_html ?? "")
  const [note, setNote] = React.useState(caseItem?.note ?? "")

  // Create-mode 相關案例 selection (directional current -> related). Held in
  // local state and submitted together with the new case; never persisted on
  // its own. Ignored entirely in edit mode.
  const [relatedIds, setRelatedIds] = React.useState<string[]>([])

  // Create-mode gallery selection: files stay LOCAL in the browser until the
  // form is submitted (no Storage writes at selection time). Each item carries
  // a stable id, the File, a local object-URL preview, and an optional ALT.
  const [galleryItems, setGalleryItems] = React.useState<
    { id: string; file: File; previewUrl: string; alt: string }[]
  >([])

  // Revoke every object URL on unmount to avoid browser memory leaks.
  React.useEffect(() => {
    return () => {
      galleryItems.forEach((it) => URL.revokeObjectURL(it.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return
    setGalleryItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        alt: "",
      })),
    ])
    // Allow re-selecting the same file(s) again after removal.
    e.target.value = ""
  }

  function handleGalleryRemove(id: string) {
    setGalleryItems((prev) => {
      const target = prev.find((it) => it.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((it) => it.id !== id)
    })
  }

  function handleGalleryAltChange(id: string, alt: string) {
    setGalleryItems((prev) => prev.map((it) => (it.id === id ? { ...it, alt } : it)))
  }

  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const isCopyCode = caseCode.startsWith("COPY-")

  const effectiveSlug = slug.trim() || slugify(name)
  const publicUrl = effectiveSlug ? `${siteConfig.url}/case-studies/${effectiveSlug}` : ""

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
    setSuccess(null)

    // Enforce the legacy required rule using a real HTML-emptiness check so
    // that visually-empty content (e.g. "<p></p>", "<br>") is rejected.
    if (isHtmlContentEmpty(detailHtml)) {
      setError("請輸入案例詳細內容。")
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    setLoading(true)

    const shippingRule = shippingMode === "custom" ? shippingCustom.trim() : shippingPreset

    const fd = new FormData()
    fd.set("category_id", categoryId)
    fd.set("name", name)
    fd.set("short_description", shortDescription)
    fd.set("location", location)
    fd.set("property_type", propertyType)
    fd.set("property_condition", propertyCondition)
    fd.set("floor_area", floorArea)
    fd.set("layout", layout)
    fd.set("seo_title", seoTitle)
    fd.set("seo_keywords", seoKeywords)
    fd.set("seo_description", seoDescription)
    fd.set("head_code", headCode)
    fd.set("slug", slug)
    fd.set("price", price)
    fd.set("original_price", originalPrice)
    fd.set("is_home", isHome ? "true" : "")
    fd.set("is_new", isNew ? "true" : "")
    fd.set("is_hot", isHot ? "true" : "")
    fd.set("is_recommended", isRecommended ? "true" : "")
    fd.set("publish_start", publishStart)
    fd.set("publish_end", publishEnd)
    fd.set("status", status)
    fd.set("case_code", caseCode)
    fd.set("stock_quantity", stockQuantity)
    fd.set("safety_stock", safetyStock)
    fd.set("shipping_rule", shippingRule)
    fd.set("description_html", descriptionHtml)
    fd.set("detail_html", detailHtml)
    fd.set("note", note)

    // Carry selected related-case ids (create mode only). Order is preserved
    // via getAll() on the server, which maps to sort_order 0,1,2...
    if (mode === "create") {
      for (const rid of relatedIds) fd.append("related_ids", rid)

      // Gallery files + positional ALT (create mode only). case_images[i]
      // pairs with case_images_alt_{i}; selection order becomes sort_order.
      galleryItems.forEach((it, i) => {
        fd.append("case_images", it.file, it.file.name)
        fd.set(`case_images_alt_${i}`, it.alt)
      })
    }

    try {
      const result =
        mode === "create"
          ? await createCase(fd)
          : await updateCase(caseItem!.id, fd)

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        // Bring the error into view.
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }

      if (mode === "create") {
        router.push(LIST_PATH)
        router.refresh()
      } else {
        setSuccess("案例已成功更新。")
        setLoading(false)
        router.refresh()
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } catch (err) {
      console.error("[v0] case form submit failed", err)
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

      {success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {/* 基本資料 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本資料</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category_id">
              <Req />
              分類
            </Label>
            <select
              id="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            {categories.length === 0 ? (
              <p className="text-xs text-destructive">
                尚未建立任何分類，請先前往「分類管理」新增分類。
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              <Req />
              案例名稱
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入案例名稱"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="short_description">案例簡述</Label>
            <Textarea
              id="short_description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="簡短描述（列表或摘要用）"
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">所在地</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：新北市林口區"
            />
          </div>

          {/* 案例基本資料：類別 / 屋況 / 坪數 / 格局（皆為選填自由文字） */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_type">類別</Label>
              <Input
                id="property_type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                placeholder="例如：社區大樓"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_condition">屋況</Label>
              <Input
                id="property_condition"
                value={propertyCondition}
                onChange={(e) => setPropertyCondition(e.target.value)}
                placeholder="例如：新成屋"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="floor_area">坪數</Label>
              <Input
                id="floor_area"
                value={floorArea}
                onChange={(e) => setFloorArea(e.target.value)}
                placeholder="例如：14坪"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layout">格局</Label>
              <Input
                id="layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                placeholder="例如：一廳一衛一臥一陽"
              />
            </div>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">自訂網址（slug）</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：taipei-inspection（可留空）"
            />
            <p className="text-xs text-muted-foreground">
              僅能使用小寫英文、數字與連字號（-）。若未填寫，系統將依序自動產生網址代碼，例如 01、02、03。
            </p>
            <div className="mt-1 flex items-center gap-2">
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

      {/* 價格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">價格</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">案例售價</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="選填"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="original_price">案例原價</Label>
            <Input
              id="original_price"
              type="number"
              min="0"
              step="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="選填"
            />
          </div>
        </CardContent>
      </Card>

      {/* 案例類別（標記） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">案例類別</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isHome}
              onChange={(e) => setIsHome(e.target.checked)}
              className="size-4 rounded border-input"
            />
            首頁案例
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="size-4 rounded border-input"
            />
            最新案例
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isHot}
              onChange={(e) => setIsHot(e.target.checked)}
              className="size-4 rounded border-input"
            />
            熱門案例
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecommended}
              onChange={(e) => setIsRecommended(e.target.checked)}
              className="size-4 rounded border-input"
            />
            推薦案例
          </label>
        </CardContent>
      </Card>

      {/* 上下架 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">上下架</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish_start">上架日期</Label>
            <Input
              id="publish_start"
              type="date"
              value={publishStart}
              onChange={(e) => setPublishStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publish_end">下架日期</Label>
            <Input
              id="publish_end"
              type="date"
              value={publishEnd}
              onChange={(e) => setPublishEnd(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">狀態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">
              <Req />
              狀態
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 案例編號 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">案例編號</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case_code">
              <Req />
              案例編號
            </Label>
            <Input
              id="case_code"
              value={caseCode}
              onChange={(e) => setCaseCode(e.target.value)}
              placeholder="請輸入唯一的案例編號"
              required
            />
            {isCopyCode ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                這是由「複製」自動產生的臨時編號，請改為正式的案例編號後再儲存。
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 庫存 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">庫存</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock_quantity">案例庫存</Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              step="1"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="選填"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="safety_stock">安全庫存</Label>
            <Input
              id="safety_stock"
              type="number"
              min="0"
              step="1"
              value={safetyStock}
              onChange={(e) => setSafetyStock(e.target.value)}
              placeholder="選填"
            />
          </div>
        </CardContent>
      </Card>

      {/* 運費 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">運費</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shipping_mode">運費規則</Label>
            <select
              id="shipping_mode"
              value={shippingMode}
              onChange={(e) => setShippingMode(e.target.value as "preset" | "custom")}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="preset">選擇常用規則</option>
              <option value="custom">自訂文字</option>
            </select>
          </div>
          {shippingMode === "preset" ? (
            <select
              aria-label="常用運費規則"
              value={shippingPreset}
              onChange={(e) => setShippingPreset(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">（不指定）</option>
              {SHIPPING_PRESETS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <Input
              aria-label="自訂運費規則"
              value={shippingCustom}
              onChange={(e) => setShippingCustom(e.target.value)}
              placeholder="請輸入運費規則說明"
            />
          )}
        </CardContent>
      </Card>

      {/* 內容 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">內容</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>案例描述</Label>
            <RichTextEditor
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              caseId={mode === "edit" ? caseItem?.id : undefined}
              ariaLabel="案例描述"
              minHeightClass="min-h-[10rem]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              <Req />
              案例詳細內容
            </Label>
            <RichTextEditor
              value={detailHtml}
              onChange={setDetailHtml}
              caseId={mode === "edit" ? caseItem?.id : undefined}
              ariaLabel="案例詳細內容"
              minHeightClass="min-h-[20rem]"
            />
            {mode === "create" ? (
              <p className="text-xs text-muted-foreground">
                內文圖片上傳需在案例建立後才可使用；儲存後即可於「編輯」頁面插入圖片。
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">備註</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="內部備註（保留舊系統欄位）"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">案例圖片</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="case_images">選擇圖片</Label>
              <input
                id="case_images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleGallerySelect}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
              />
              <p className="text-xs text-muted-foreground">
                可一次選擇多張圖片（單檔上限 8 MB，僅限圖片格式）。圖片會在按下「新增案例」時一併上傳。
                {galleryItems.length > 0 ? "第一張圖片將作為案例封面。" : ""}
              </p>
            </div>

            {galleryItems.length > 0 ? (
              <ul className="flex flex-col gap-3" role="list">
                {galleryItems.map((it, index) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start"
                  >
                    <div className="flex items-center gap-2 sm:flex-col">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      {index === 0 ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          封面
                        </span>
                      ) : null}
                    </div>

                    <div className="size-24 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.previewUrl || "/placeholder.svg"}
                        alt={`預覽：${it.file.name}`}
                        className="size-full object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className="truncate text-sm font-medium text-foreground" title={it.file.name}>
                        {it.file.name}
                      </p>
                      <label htmlFor={`gallery-alt-${it.id}`} className="text-xs text-muted-foreground">
                        ALT 文字（選填）
                      </label>
                      <Input
                        id={`gallery-alt-${it.id}`}
                        value={it.alt}
                        onChange={(e) => handleGalleryAltChange(it.id, e.target.value)}
                        placeholder="請輸入圖片替代文字"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGalleryRemove(it.id)}
                      aria-label={`移除圖片 ${it.file.name}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "shrink-0 gap-1 text-destructive hover:text-destructive",
                      )}
                    >
                      <X className="size-3.5" aria-hidden />
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                <ImagePlus className="size-4 shrink-0" aria-hidden />
                尚未選擇圖片。案例圖片為選填，建立後亦可於「編輯」頁面新增。
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle>相關案例</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              可在建立案例的同時挑選相關案例。此設定為單向：僅影響此案例所顯示的相關案例。
              相關案例會與案例一併建立。
            </p>
            <RelatedCaseSelector
              candidates={relatedCandidates}
              selected={relatedIds}
              onChange={setRelatedIds}
            />
          </CardContent>
        </Card>
      ) : null}

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
          ) : mode === "create" ? (
            "新增案例"
          ) : (
            "儲存變更"
          )}
        </button>
        <Link href={LIST_PATH} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          {mode === "create" ? "取消" : "返回列表"}
        </Link>
      </div>
    </form>
  )
}
