import Link from "next/link"
import { requireAdmin } from "@/lib/admin/auth"
import { signOutAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

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
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
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
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}
