import { Ban } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { KeywordCount } from '@/lib/types/keyword'

export interface KeywordRankCardListProps {
  /** 필터 적용 후 표시 대상 전체 목록(내림차순 정렬 유지, 서버가 이미 정렬해 내려준다). */
  items: KeywordCount[]
  /** 행별 Ban 버튼 클릭 시 호출한다. 불용어 추가 + force 재분석은 페이지가 처리한다. */
  onAddStopword: (keyword: string) => void
  /** 지금 추가 처리 중인 키워드 — 그 카드의 버튼만 비활성화한다. */
  pendingKeyword: string | null
}

/**
 * ④ 키워드 랭킹 — `sm:` 미만에서 `KeywordRankTable`을 대신하는 카드 리스트(docs/screens/03-hot-keyword.md
 * §④, README 공통 규칙 "표는 카드 리스트로 대체"). 정보 구성은 표와 동일(순위/키워드/품사/횟수/비중/액션).
 * 루트에 `sm:hidden`을 직접 둔다 — 페이지는 감싸는 wrapper div를 두지 않는다.
 */
export function KeywordRankCardList({
  items,
  onAddStopword,
  pendingKeyword,
}: KeywordRankCardListProps) {
  const topCount = items[0]?.count ?? 1

  return (
    <div className="space-y-3 sm:hidden">
      <h2 className="text-sm font-medium text-muted-foreground">
        키워드 랭킹 (Top {items.length})
      </h2>
      {items.map((item, index) => {
        const ratio = topCount > 0 ? item.count / topCount : 0
        return (
          <Card key={item.keyword}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                  <span className="font-medium">{item.keyword}</span>
                  <Badge variant="outline">{item.posTag}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${item.keyword} 불용어로 추가`}
                  disabled={pendingKeyword === item.keyword}
                  onClick={() => onAddStopword(item.keyword)}
                >
                  <Ban className="text-muted-foreground" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {/* 장식용 막대 — 수치는 옆 텍스트로 항상 병기하므로 스크린리더에서 숨긴다. */}
                <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {item.count}회 · {Math.round(ratio * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
