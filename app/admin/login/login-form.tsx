"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Standard client-side POST to the API route. All auth + admin
      // verification happens server-side, so session cookies are written
      // reliably by the route handler.
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const result = (await res.json().catch(() => ({ ok: false, code: "unexpected" }))) as {
        ok: boolean
        code?: string
      }

      if (!result.ok) {
        switch (result.code) {
          case "email_not_confirmed":
            setError("此帳號的電子郵件尚未驗證，請先完成驗證後再登入。")
            break
          case "rate_limited":
            setError("嘗試次數過多，請稍後再試。")
            break
          case "invalid_credentials":
            setError("電子郵件或密碼錯誤。")
            break
          case "not_admin":
            setError("此帳號沒有後台管理權限。")
            break
          default:
            setError("登入時發生非預期的錯誤，請稍後再試。")
        }
        setLoading(false)
        return
      }

      router.replace(redirectTo)
      router.refresh()
    } catch (err) {
      console.error("前端登入請求發生例外", err)
      setError("無法連線至伺服器，請稍後再試。")
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">管理員登入</CardTitle>
        <CardDescription>請輸入您的帳號密碼以進入後台。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">電子郵件</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Native submit button: base-ui's Button forces type="button" on
              native elements, which silently prevents form submission. A real
              <button type="submit"> guarantees the form posts to the action. */}
          <button
            type="submit"
            disabled={loading}
            className={cn(buttonVariants({ size: "lg" }), "mt-1 w-full")}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                登入中...
              </>
            ) : (
              "登入"
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
