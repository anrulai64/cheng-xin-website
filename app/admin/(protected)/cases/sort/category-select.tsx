"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export type CategoryOption = { id: string; name: string }

/**
 * Category selector for 案例排序. Selecting a category navigates to
 * /admin/cases/sort?category={id} so the choice is preserved across refresh
 * and back/forward navigation (server-rendered from the URL).
 */
export function CategorySelect({
  categories,
  selectedId,
}: {
  categories: CategoryOption[]
  selectedId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    startTransition(() => {
      if (value) {
        router.push(`/admin/cases/sort?category=${encodeURIComponent(value)}`)
      } else {
        router.push("/admin/cases/sort")
      }
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="case-sort-category" className="text-sm font-medium text-foreground">
        分類：
      </label>
      <select
        id="case-sort-category"
        value={selectedId ?? ""}
        onChange={handleChange}
        disabled={pending}
        className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <option value="">請選擇分類</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
