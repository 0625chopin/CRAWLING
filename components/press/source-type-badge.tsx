import { Globe, Rss } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { PressSource } from '@/lib/types/press'

export interface SourceTypeBadgeProps {
  sourceType: PressSource['sourceType']
}

/**
 * 언론사 수집 방식 배지. 언론사 관리(표·카드)와 크롤링 실행 화면(01)이 함께 쓴다
 * (docs/screens/04-press-manage.md §컴포넌트 분할 경계 — 도메인이 언론사라 이 화면 소속이지만
 * 01이 그대로 import한다). 아이콘은 장식이므로 aria-hidden, 텍스트("RSS"/"HTML")가 실제 내용이다
 * (색상 단독으로 방식을 전달하지 않는다).
 */
export function SourceTypeBadge({ sourceType }: SourceTypeBadgeProps) {
  return sourceType === 'rss' ? (
    <Badge variant="secondary" className="gap-1">
      <Rss className="size-3" aria-hidden="true" />
      RSS
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Globe className="size-3" aria-hidden="true" />
      HTML
    </Badge>
  )
}
