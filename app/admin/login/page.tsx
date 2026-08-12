import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin/auth"
import { LoginForm } from "./login-form"

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  // Already a verified admin? Skip the form.
  const admin = await getAdminUser()
  if (admin) {
    redirect("/admin")
  }

  const { redirectTo } = await searchParams
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/admin") ? redirectTo : "/admin"

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-heading text-2xl font-bold text-foreground">
            誠昕驗屋
          </p>
          <p className="mt-1 text-sm text-muted-foreground">後台管理系統</p>
        </div>
        <LoginForm redirectTo={safeRedirect} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          僅限授權管理人員登入
        </p>
      </div>
    </main>
  )
}
