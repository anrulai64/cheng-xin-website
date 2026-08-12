import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google'
import './globals.css'
import { siteConfig } from '@/lib/site-data'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { FloatingContact } from '@/components/floating-contact'
import { OrganizationSchema } from '@/components/structured-data'

const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
})
const notoSerifTC = Noto_Serif_TC({
  variable: '--font-noto-serif-tc',
  subsets: ['latin'],
  weight: ['600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}｜${siteConfig.slogan}`,
    template: `%s｜${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    '驗屋', '驗屋公司', '桃園驗屋', '台北驗屋', '新北驗屋', '新竹驗屋',
    '新成屋驗屋', '中古屋驗屋', '預售屋驗收', '熱顯像儀', '驗屋報告', '誠昕驗屋',
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  generator: 'v0.app',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: siteConfig.url,
    title: `${siteConfig.name}｜${siteConfig.slogan}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name}｜${siteConfig.slogan}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const viewport = {
  themeColor: '#fe9524',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-Hant-TW"
      className={`${notoSansTC.variable} ${notoSerifTC.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <OrganizationSchema />
        <SiteHeader />
        {children}
        <SiteFooter />
        <FloatingContact />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
