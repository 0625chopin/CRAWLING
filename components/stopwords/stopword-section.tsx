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
  emptyState,
  onDeleted,
}: StopwordSectionProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-sm font-medium">
          {title} ({items.length})
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
