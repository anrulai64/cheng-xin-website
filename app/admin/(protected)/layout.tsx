import Link from "next/link"
import { requireAdmin } from "@/lib/admin/auth"
import { signOutAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { AdminSidebarNav } from "./admin-nav"

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authoritative gate: verifies the Supabase session AND the admin_users row.
  const admin = await requireAdmin()

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <Link href="/admin" className="font-heading text-base font-bold">
            誠昕驗屋 <span className="text-muted-foreground">後台</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {admin.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                登出
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex flex-col md:flex-row">
        <AdminSidebarNav />
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
