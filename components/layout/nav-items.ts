import { Ban, Bug, FileText, Flame, Newspaper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/**
 * 헤더 데스크톱 내비와 모바일 Sheet가 공유하는 단일 메뉴 데이터 소스.
 * 메뉴를 늘리거나 순서를 바꿀 일이 생기면 이 배열만 고치면 된다.
 *
 * 아이콘은 lucide에 거미(spider)가 없어 크롤러/봇을 연상시키는 Bug로 대체했다.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '크롤링 실행', icon: Bug },
  { href: '/results', label: '수집 결과', icon: FileText },
  { href: '/keywords', label: '핫 키워드 분석', icon: Flame },
  { href: '/press', label: '언론사 관리', icon: Newspaper },
  { href: '/stopwords', label: '불용어 관리', icon: Ban },
]

/**
 * 현재 경로가 해당 메뉴에 해당하는지 판정한다.
 * 홈('/')은 하위 경로를 갖지 않으므로 완전 일치로만 활성화하고,
 * 나머지는 하위 경로(예: /press/etnews)에서도 상위 메뉴가 활성으로 남게 한다.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
