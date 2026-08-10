import Link from 'next/link'
import { Bug } from 'lucide-react'

import { MainNav } from './main-nav'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'

/**
 * 모든 페이지가 공유하는 상단 헤더.
 * 서버 컴포넌트로 두고, 인터랙션이 필요한 조각(MobileNav, ThemeToggle,
 * 현재 경로를 읽는 MainNav)만 각자 'use client' 경계를 갖는다.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold sm:text-base"
          >
            <Bug aria-hidden="true" className="size-5" />
            {/* 카테고리가 IT/AI 외 4종으로 늘면서(Task 028) "IT/AI 뉴스"는 더 이상 정확하지
                않다 — 제품 이름이라 과하게 길어지지 않는 선에서 카테고리 중립 이름으로 바꿨다. */}
            <span className="hidden lg:inline">뉴스 핫 키워드 크롤러</span>
            <span className="lg:hidden">핫키워드 크롤러</span>
          </Link>
          <MainNav />
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
