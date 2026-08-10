'use client'

import { Inbox } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorAlert } from '@/components/common/error-alert'
import { SourceTypeBadge } from '@/components/press/source-type-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { PressSourceWithUrl } from '@/lib/api/press-client'

export type PressListLoadState = 'loading' | 'error' | 'ready'

// components/ui/checkbox.tsx는 radix-ui의 CheckboxPrimitive.Root를 그대로 감싼 것이라
// checked가 받는 값은 정확히 이 세 가지뿐이다(@radix-ui/react-checkbox의 CheckedState).
// 미선언 의존성이라 그 타입을 직접 import하지 않고(docs/CONVENTIONS.md §3 nanoid 사례와 같은
// 이유) 여기서 동일한 모양을 다시 선언한다.
type CheckedState = boolean | 'indeterminate'

export interface PressSelectCardProps {
  loadState: PressListLoadState
  pressList: PressSourceWithUrl[]
  selectedIds: ReadonlySet<string>
  onToggleOne: (id: string) => void
  onToggleAll: (nextChecked: boolean) => void
  onRetry: () => void
  /** 크롤링 실행 중에는 선택을 바꿀 수 없다(설계서 §③ "실행 중에는 체크박스를 disabled 처리"). */
  disabled?: boolean
}

/**
 * ② 언론사 선택 카드. 설계서 01의 상태 ①②⑥⑦(기본/일부 선택/언론사 0건/목록 로딩)을 이
 * 컴포넌트가 전부 그린다. 진행 중(③)·완료(④)·부분 실패(⑤)는 crawl-run-panel.tsx +
 * press-run-status-list.tsx(Task 016B)의 몫이라 여기서는 다루지 않는다 — 이 컴포넌트가 아는
 * 것은 "지금 선택을 바꿀 수 있는가"(disabled prop) 뿐이다.
 */
export function PressSelectCard({
  loadState,
  pressList,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onRetry,
  disabled = false,
}: PressSelectCardProps) {
  const total = pressList.length
  const selectedCount = selectedIds.size
  const allChecked: CheckedState =
    selectedCount === 0 ? false : selectedCount === total ? true : 'indeterminate'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>언론사 선택</CardTitle>
        {loadState === 'ready' && total > 0 && (
          <span
            id="press-select-summary"
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {selectedCount}/{total}개 선택됨
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loadState === 'error' && (
          <ErrorAlert description="언론사 목록을 불러오지 못했습니다" onRetry={onRetry} />
        )}

        {loadState === 'loading' && (
          <div className="space-y-2" role="status" aria-live="polite">
            <span className="sr-only">언론사 목록을 불러오는 중입니다</span>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {loadState === 'ready' && total === 0 && (
          <EmptyState
            icon={<Inbox />}
            title="등록된 언론사가 없습니다"
            description="언론사 관리에서 먼저 언론사를 등록하세요"
            actionLabel="언론사 관리로 이동"
            actionHref="/press"
          />
        )}

        {loadState === 'ready' && total > 0 && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  aria-label="전체 언론사 선택"
                  checked={allChecked}
                  disabled={disabled}
                  onCheckedChange={(checked) => onToggleAll(checked === true)}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  전체 선택
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || selectedCount === 0}
                onClick={() => onToggleAll(false)}
              >
                전체 해제
              </Button>
            </div>

            <Separator />

            <ScrollArea className="h-[320px] pr-3 sm:h-[420px]">
              <ul role="group" aria-labelledby="press-select-summary" className="space-y-1">
                {pressList.map((press) => (
                  <li key={press.id}>
                    <label
                      htmlFor={`press-${press.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-muted"
                    >
                      <span className="flex items-center gap-3">
                        <Checkbox
                          id={`press-${press.id}`}
                          checked={selectedIds.has(press.id)}
                          disabled={disabled}
                          onCheckedChange={() => onToggleOne(press.id)}
                        />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{press.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {press.sourceUrl}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {/* sourceType으로 URL을 다시 조립하지 않는다 — sourceUrl은 API가 이미
                            내려준 값을 그대로 쓴다(Task 008). 배지는 Task 009A의 재사용 컴포넌트. */}
                        <SourceTypeBadge sourceType={press.sourceType} />
                        {press.isActive && <Badge variant="secondary">활성</Badge>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
