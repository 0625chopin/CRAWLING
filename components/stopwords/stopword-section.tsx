import type { ReactNode } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { StopwordChip } from '@/components/stopwords/stopword-chip'
import type { Stopword } from '@/lib/types/stopword'

export interface StopwordSectionEmptyState {
  icon: ReactNode
  title: string
  description: string
}

export interface StopwordSectionProps {
  headingId: string
  title: string
  description?: string
  items: Stopword[]
  /**
   * 헤딩에 표시할 개수. 생략하면 items.length를 쓴다. 검색 필터링 중에는 화면에 그리는
   * items(필터된 결과)와 헤딩 개수를 분리해야 한다 — 검색 결과가 0건이어도 "기본 제공
   * 불용어 (0)"이 아니라 원래 총 개수를 유지해야 "검색어와 일치하는 게 없다"는 뜻이
   * 정확히 전달된다(docs/screens/05-stopword-manage.md §상태별 화면 ⑥ "섹션 구조(제목 +
   * 개수)는 유지"). 검색을 구현하는 012B가 원본 총 개수를 명시적으로 넘긴다.
   */
  totalCount?: number
  /** items가 비었을 때 보여줄 안내. 기본 제공 섹션은 항상 프리셋이 있어 생략 가능하다. */
  emptyState?: StopwordSectionEmptyState
  onDeleted: (stopword: Stopword) => void
}

/**
 * 기본 제공·사용자 추가 두 섹션이 공유하는 골격(제목 + 개수 + 칩 목록 또는 빈 자리).
 * 검색 결과 0건 자리도 이 컴포넌트가 그대로 재사용한다 — 섹션 제목·개수는 남기고
 * emptyState만 바꾸면 된다(docs/screens/05-stopword-manage.md §상태별 화면 ⑥, 012B 몫).
 */
export function StopwordSection({
  headingId,
  title,
  description,
  items,
  totalCount,
  emptyState,
  onDeleted,
}: StopwordSectionProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-sm font-medium">
          {title} ({totalCount ?? items.length})
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {items.length === 0 && emptyState ? (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
        />
      ) : (
        <ul role="list" className="flex flex-wrap gap-2">
          {items.map((item) => (
            <StopwordChip key={item.id} stopword={item} onDeleted={onDeleted} />
          ))}
        </ul>
      )}
    </section>
  )
}
