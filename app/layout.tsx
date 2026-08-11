import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { AppStateProvider } from '@/components/app-state-provider'
import { SiteHeader } from '@/components/layout/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '뉴스 핫 키워드 크롤러',
  description:
    '선택한 언론사에서 IT/AI·엔터·스포츠·경제·증권 기사를 수집하고 형태소 분석으로 핫 키워드를 뽑아내는 도구',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes가 최초 렌더 직후 class를 주입하므로 경고 억제가 필요하다
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* 라우트가 바뀌어도 이 레이아웃은 다시 마운트되지 않는다 — 탭 전환에도 살아남아야
              하는 화면 상태(Task 031)를 여기, ThemeProvider 안쪽에 둔다. */}
          <AppStateProvider>
            <SiteHeader />
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
