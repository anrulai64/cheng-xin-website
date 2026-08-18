import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Sub-navigation for the category section: 分類管理 | 分類排序.
 */
export function CategoryTabs({ active }: { active: "manage" | "sort" }) {
  const tabs = [
    { key: "manage" as const, label: "分類管理", href: "/admin/cases/categories" },
    { key: "sort" as const, label: "分類排序", href: "/admin/cases/categories/sort" },
  ]

  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
