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
import { PRESS_CATEGORY_LABELS, pressCategorySchema, type PressCategory } from '@/lib/types/press'

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
  /** 카테고리 헤더의 전체 선택/해제(Task 028) — 그 카테고리에 속한 언론사만 한 번에 토글한다. */
  onToggleCategory: (category: PressCategory, nextChecked: boolean) => void
  onRetry: () => void
  /** 크롤링 실행 중에는 선택을 바꿀 수 없다(설계서 §③ "실행 중에는 체크박스를 disabled 처리"). */
  disabled?: boolean
}

/**
 * 카테고리별로 묶는다(Task 028 — "언론사 선택 카드를 카테고리로 묶어 보여준다"). 카테고리가
 * 하나도 없는 그룹은 렌더링하지 않고, 고정 순서(`pressCategorySchema.options`)를 따른다 —
 * 목록 순서가 매 렌더마다 흔들리면 안 되기 때문이다.
 */
function groupByCategory(
  pressList: PressSourceWithUrl[]
): [PressCategory, PressSourceWithUrl[]][] {
  const groups = new Map<PressCategory, PressSourceWithUrl[]>()
  for (const press of pressList) {
    const list = groups.get(press.category)
    if (list) list.push(press)
    else groups.set(press.category, [press])
  }
  return pressCategorySchema.options
    .filter((category) => groups.has(category))
    .map((category) => [category, groups.get(category)!] as [PressCategory, PressSourceWithUrl[]])
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
  onToggleCategory,
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
              <div role="group" aria-labelledby="press-select-summary" className="space-y-4">
                {groupByCategory(pressList).map(([category, presses]) => {
                  const selectedInGroup = presses.filter((press) => selectedIds.has(press.id)).length
                  const groupChecked: CheckedState =
                    selectedInGroup === 0
                      ? false
                      : selectedInGroup === presses.length
                        ? true
                        : 'indeterminate'

                  return (
                    <div key={category} className="space-y-1">
                      {/* 카테고리 헤더 — 전체 선택 체크박스와 같은 3단 상태를 쓴다(Task 028).
                          Task 030으로 언론사가 17→34곳이 되며 스포츠(7)·IT/AI(8)처럼 뷰포트
                          (320~420px)보다 큰 그룹이 생겨, 헤더가 스크롤에 그냥 흘러가면 지금
                          보는 항목이 어느 카테고리인지 알 수 없어졌다(Task 030 교차검증 발견,
                          22일차). `sticky top-0`으로 고정하고 `bg-card`로 배경을 채운다 —
                          Radix ScrollArea의 Viewport가 실제 스크롤 컨테이너라 그 안에서
                          sticky가 그대로 성립한다. 배경이 없으면 아래로 스크롤되는 항목들이
                          헤더 글자와 겹쳐 보인다. */}
                      <div className="sticky top-0 z-10 flex items-center gap-2 bg-card px-1 py-1.5">
                        <Checkbox
                          id={`press-category-${category}`}
                          checked={groupChecked}
                          disabled={disabled}
                          aria-label={`${PRESS_CATEGORY_LABELS[category]} 카테고리 전체 선택`}
                          onCheckedChange={(checked) =>
                            onToggleCategory(category, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`press-category-${category}`}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          {PRESS_CATEGORY_LABELS[category]} ({presses.length})
                        </Label>
                      </div>
                      <ul className="space-y-1">
                        {presses.map((press) => (
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
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
