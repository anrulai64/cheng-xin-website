import { requireAdmin } from "@/lib/admin/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          後台管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          歡迎回來，{admin.email}（{admin.role}）。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>內容管理</CardTitle>
          <CardDescription>
            登入驗證已完成。內容管理功能將於後續階段建置。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            目前僅提供安全登入與權限驗證。文章、案例、服務項目與網站設定等管理介面即將推出。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
