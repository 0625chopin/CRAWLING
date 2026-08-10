'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SourceTypeBadge } from '@/components/press/source-type-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { updatePressActive, type PressSourceWithUrl } from '@/lib/api/press-client'
import { PRESS_CATEGORY_LABELS } from '@/lib/types/press'

export interface PressCardListProps {
  pressList: PressSourceWithUrl[]
  onActiveChanged: (press: PressSourceWithUrl) => void
  /**
   * 수정·삭제 버튼 클릭 콜백. 다이얼로그 연결은 Task 009B 몫이라(`press-form-dialog.tsx`·
   * `delete-press-dialog.tsx`) 이 컴포넌트는 어떤 다이얼로그도 import하지 않는다 —
   * 009B가 `app/press/page.tsx`에서 이 값을 넘겨 다이얼로그를 열도록 연결한다.
   */
  onEditRequest?: (press: PressSourceWithUrl) => void
  onDeleteRequest?: (press: PressSourceWithUrl) => void
}

/** press-table.tsx의 것과 동일한 판정 — 카드에서도 펼칠 내용이 없으면 버튼을 만들지 않는다. */
function expandLabelOf(press: PressSourceWithUrl): string | null {
  if (press.sourceType === 'html') return '셀렉터 3개'
  return press.contentSelector ? '본문 셀렉터' : null
}

/** 모바일(md 미만) 언론사 카드 리스트 — 표와 같은 정보를 세로로 압축한다. */
export function PressCardList({
  pressList,
  onActiveChanged,
  onEditRequest,
  onDeleteRequest,
}: PressCardListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingActiveId, setPendingActiveId] = useState<string | null>(null)

  async function handleActiveChange(press: PressSourceWithUrl, next: boolean) {
    setPendingActiveId(press.id)
    try {
      const updated = await updatePressActive(press.id, next)
      onActiveChanged(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '활성 상태 변경에 실패했습니다')
    } finally {
      setPendingActiveId(null)
    }
  }

  return (
    <div className="grid gap-3 md:hidden">
      {pressList.map((press) => {
        const expandLabel = expandLabelOf(press)
        const isExpanded = expandedId === press.id

        return (
          <Card key={press.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex flex-wrap items-center gap-2 font-medium">
                {press.name}
                <SourceTypeBadge sourceType={press.sourceType} />
                <Badge variant="outline">{PRESS_CATEGORY_LABELS[press.category]}</Badge>
              </h2>
              <div className="flex items-center gap-2">
                <Switch
                  checked={press.isActive}
                  disabled={pendingActiveId === press.id}
                  aria-label={`${press.name} 활성 상태`}
                  onCheckedChange={(next) => handleActiveChange(press, next)}
                />
                <span className="text-xs text-muted-foreground">
                  {press.isActive ? '활성' : '비활성'}
                </span>
              </div>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {press.sourceUrl}
            </p>

            {expandLabel ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                aria-expanded={isExpanded}
                aria-controls={`press-selectors-mobile-${press.id}`}
                onClick={() => setExpandedId(isExpanded ? null : press.id)}
              >
                {expandLabel} 보기
                {isExpanded ? (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">피드 요약만</p>
            )}

            {expandLabel && isExpanded ? (
              <dl
                id={`press-selectors-mobile-${press.id}`}
                className="mt-2 space-y-2 rounded-md bg-muted/40 p-2 text-xs"
              >
                {press.sourceType === 'html' ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground">기사 링크</dt>
                      <dd className="font-mono">{press.articleLinkSelector}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">제목</dt>
                      <dd className="font-mono">{press.titleSelector}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">본문</dt>
                      <dd className="font-mono">{press.contentSelector}</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-muted-foreground">본문 셀렉터</dt>
                      <dd className="font-mono">{press.contentSelector}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">본문 출처</dt>
                      <dd>원문 전문 (피드 요약 대신 원문 페이지에서 수집)</dd>
                    </div>
                  </>
                )}
              </dl>
            ) : null}

            <div className="mt-3 flex justify-end gap-2">
              {/* 다이얼로그 연결은 009B 몫 — 여기서는 요청 콜백만 알린다 */}
              <Button variant="outline" size="sm" onClick={() => onEditRequest?.(press)}>
                <Pencil className="size-3.5" />
                수정
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDeleteRequest?.(press)}>
                <Trash2 className="size-3.5 text-destructive" />
                삭제
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
