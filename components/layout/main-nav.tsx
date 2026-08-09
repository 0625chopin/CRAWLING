'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

import { isNavItemActive, NAV_ITEMS } from './nav-items'

export interface MainNavProps {
  className?: string
}

/**
 * 데스크톱(≥768px) 전용 평면 내비게이션.
 * 하위 메뉴가 없으므로 Trigger/Content 없이 링크만 나열하고,
 * 드롭다운 패널을 띄우지 않으니 viewport도 끈다.
 */
export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname()

  return (
    <NavigationMenu
      aria-label="주 메뉴"
      viewport={false}
      className={cn('hidden md:flex', className)}
    >
      <NavigationMenuList>
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname)
          return (
            <NavigationMenuItem key={item.href}>
              {/* active prop이 aria-current="page"와 data-active를 함께 붙여준다 */}
              <NavigationMenuLink asChild active={isActive}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-row items-center gap-1.5 whitespace-nowrap',
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
