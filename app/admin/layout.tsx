import type { Metadata } from "next"

// The entire /admin area must never be indexed by search engines.
export const metadata: Metadata = {
  title: "後台管理",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-muted/30">{children}</div>
}
