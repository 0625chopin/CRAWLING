'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

/**
 * 라이트/다크 토글 버튼.
 *
 * 아이콘은 dark: variant로 교차 표시하므로 렌더 시점에 테마 값이 필요 없다.
 * 어느 쪽으로 전환할지는 클릭 시점에 <html>의 dark 클래스를 직접 읽어 정한다.
 * next-themes가 하이드레이션 이전에 인라인 스크립트로 클래스를 붙여 주므로
 * 이 값이 항상 정확하고, 렌더 결과가 서버/클라이언트에서 동일해
 * 마운트 상태를 따로 들고 있을 필요가 없다(하이드레이션 불일치 없음).
 */
export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="다크 모드 전환"
      onClick={() => {
        const isDark = document.documentElement.classList.contains('dark')
        setTheme(isDark ? 'light' : 'dark')
      }}
    >
      <Sun
        aria-hidden="true"
        className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
      />
      <Moon
        aria-hidden="true"
        className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
      />
      <span className="sr-only">다크 모드 전환</span>
    </Button>
  )
}
