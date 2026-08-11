import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import type { DailyKeywordItem } from '@/lib/api/keyword-client'

export interface KeywordDeltaProps {
  /** 직전 시간대의 언급 기사 수. null이면 비교할 구간 자체가 없다. */
  previousCount: DailyKeywordItem['previousCount']
  /** `count - previousCount`. previousCount가 null이면 null. */
  delta: DailyKeywordItem['delta']
}

/**
 * 직전 시간대 대비 증감 표시. 화살표 아이콘은 `aria-hidden`이고 **부호가 붙은 숫자와 한국어
 * 라벨을 항상 병기**한다 — 색·화살표 방향만으로 증감을 전달하지 않는다(WCAG 1.4.1,
 * docs/CONVENTIONS.md §8).
 *
 * 세 상태를 서로 다른 문구로 가른다:
 * - `delta === null` — 비교할 구간이 없다(전체 시간대이거나 하루의 첫 구간 0~3시). "0"으로
 *   보여주면 "직전 구간과 똑같았다"는 없는 사실이 된다.
 * - `previousCount === 0` — 직전 구간에는 한 건도 없던 키워드다. 증가폭 숫자만 보여주면
 *   "원래 있던 게 늘었다"로 읽히므로 「신규」로 따로 표시한다.
 * - 그 외 — 부호 붙은 증감.
 */
export function KeywordDelta({ previousCount, delta }: KeywordDeltaProps) {
  if (delta === null || previousCount === null) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">비교할 직전 시간대가 없습니다</span>
      </span>
    )
  }

  if (previousCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-primary">
        <TrendingUp className="size-4" aria-hidden="true" />
        신규 +{delta}
      </span>
    )
  }

  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-4" aria-hidden="true" />
        변동 없음
      </span>
    )
  }

  const increased = delta > 0
  const Icon = increased ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums ${
        increased ? 'font-medium text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {increased ? '+' : ''}
      {delta}
      <span className="sr-only">{increased ? '증가' : '감소'}</span>
    </span>
  )
}
