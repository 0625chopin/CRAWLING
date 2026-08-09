'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import { isNavItemActive, NAV_ITEMS } from './nav-items'

/**
 * 768px 미만에서만 보이는 햄버거 트리거 + 좌측 Sheet 패널.
 * 링크를 누르면 패널이 닫혀야 하므로 열림 상태를 직접 들고 있는다
 * (SheetClose asChild + Link 조합은 Radix가 Link의 onClick을 삼키는 경우가 있어
 *  onOpenChange로 명시적으로 제어한다).
 */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 sm:max-w-sm">
        {/* Radix Dialog는 제목/설명이 없으면 콘솔 경고를 내므로 화면에서만 숨긴다 */}
        <SheetHeader className="sr-only">
          <SheetTitle>메뉴</SheetTitle>
          <SheetDescription>페이지 이동 메뉴입니다</SheetDescription>
        </SheetHeader>
        {/* 닫기 버튼이 absolute top-3 right-3(32px)에 떠 있어 첫 항목과 겹친다.
            제목을 sr-only로 숨겼으니 그만큼 위 여백을 직접 확보한다. */}
        <nav aria-label="주 메뉴" className="flex flex-col gap-1 px-4 pt-12">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname)
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted',
                    isActive
                      ? 'bg-muted/50 font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </SheetClose>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
