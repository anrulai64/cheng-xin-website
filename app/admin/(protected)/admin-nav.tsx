"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = { label: string; href: string }
type NavGroup = { label: string; items: NavItem[] }

// Navigation model for the admin CMS. Article CMS is intentionally omitted
// (postponed). Keep this in sync with the route skeletons under /admin/cases.
const NAV: (NavItem | NavGroup)[] = [
  { label: "後台首頁", href: "/admin" },
  {
    label: "實績案例",
    items: [
      { label: "分類管理", href: "/admin/cases/categories" },
      { label: "分類排序", href: "/admin/cases/categories/sort" },
      { label: "案例管理", href: "/admin/cases" },
      { label: "案例排序", href: "/admin/cases/sort" },
      { label: "案例介紹文字", href: "/admin/cases/intro" },
      { label: "常見問題", href: "/admin/cases/faq" },
    ],
  },
]

function isGroup(node: NavItem | NavGroup): node is NavGroup {
  return "items" in node
}

// Exact match for index-style routes, prefix match otherwise, but never let a
// parent like /admin/cases stay "active" when on a deeper sibling route.
function useIsActive() {
  const pathname = usePathname()
  return React.useCallback(
    (href: string) => {
      if (href === "/admin") return pathname === "/admin"
      if (href === "/admin/cases") {
        // "案例管理" is the cases index; don't highlight it on nested routes.
        return pathname === "/admin/cases"
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname],
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive()

  return (
    <nav className="flex flex-col gap-6" aria-label="後台導覽">
      {NAV.map((node) => {
        if (!isGroup(node)) {
          const active = isActive(node.href)
          return (
            <Link
              key={node.href}
              href={node.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {node.label}
            </Link>
          )
        }

        return (
          <div key={node.label} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {node.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {node.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export function AdminSidebarNav() {
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])

  return (
    <>
      {/* Mobile toggle bar */}
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
          選單
        </button>
      </div>

      {/* Mobile collapsible panel */}
      {open ? (
        <div id="admin-mobile-nav" className="border-b bg-card px-4 py-4 md:hidden">
          <NavLinks onNavigate={close} />
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-card md:block">
        <div className="sticky top-0 px-3 py-6">
          <NavLinks />
        </div>
      </aside>
    </>
  )
}
