'use client'

import { Play, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export interface CrawlRunPanelProps {
  /** 실행 중이면 진행 상태 폴링 대상이 되는 id. 아직 시작 전이면 null. */
  runId: string | null
  isRunning: boolean
  isStarting: boolean
  /** 언론사 0건이면 실행 버튼을 비활성 유지하고 안내문을 바꾼다(설계서 §⑥). */
  isPressEmpty: boolean
  /**
   * 선택된 언론사 수. 선택 상태 자체는 좌측 press-select-card와 공유하는 값이라
   * app/page.tsx가 쥐고 이 프롭으로만 내려준다 — 이 컴포넌트는 개수만 알면 된다.
   */
  selectedCount: number
  maxArticlesPerPress: string
  onMaxArticlesPerPressChange: (value: string) => void
  onStart: () => void
}

/**
 * ③④ 크롤링 옵션 & 실행 패널(`docs/screens/01-crawl-run.md` §파일 분할 경계, `docs/DECISIONS.md`
 * D-011). 016A는 옵션 입력·실행 버튼·"실행 중" 최소 표시까지만 채운다. 진행률·언론사별 상태
 * 리스트·완료·부분 실패(설계서 §③④⑤)는 016B가 이 컴포넌트 내부의 TODO 자리를 채워 넣는다 —
 * app/page.tsx를 다시 고치지 않는다(D-006).
 */
export function CrawlRunPanel({
  runId,
  isRunning,
  isStarting,
  isPressEmpty,
  selectedCount,
  maxArticlesPerPress,
  onMaxArticlesPerPressChange,
  onStart,
}: CrawlRunPanelProps) {
  const canStart = !isRunning && !isStarting && !isPressEmpty && selectedCount > 0

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>크롤링 실행</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="max-articles" className="flex items-center gap-1.5 text-sm">
            <Settings2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
            언론사당 최대 수집 기사 수
          </Label>
          <Input
            id="max-articles"
            type="number"
            min={1}
            max={100}
            value={maxArticlesPerPress}
            disabled={isRunning || isStarting}
            onChange={(event) => onMaxArticlesPerPressChange(event.target.value)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">선택 사항 · 비워두면 기본값(20건) 사용</p>
        </div>

        <Separator />

        {!isRunning ? (
          <>
            <Button className="w-full" size="lg" disabled={!canStart} onClick={onStart}>
              <Play aria-hidden="true" />
              {isStarting ? '크롤링 시작 중…' : '크롤링 시작'}
            </Button>
            {!canStart && (
              <p className="text-center text-xs text-muted-foreground">
                {isPressEmpty
                  ? '언론사 관리에서 언론사를 먼저 등록하세요'
                  : '언론사를 1개 이상 선택하세요'}
              </p>
            )}
          </>
        ) : (
          // TODO(016B): 진행 중(③)·완료(④)·부분 실패(⑤) 화면을 여기서 분기해 그린다
          // (docs/screens/01-crawl-run.md §상태별 화면). 진행 중 블록에서는 여기서
          // press-run-status-list.tsx(신규, 이 회차에서 만들지 않았다)를 호출해 언론사별
          // 상태 리스트(대기/진행중/완료/실패)를 그린다. 진행률·현재 언론사는
          // hooks/use-crawl-progress.ts(Task 015B, 완료)가 이미 돌려주는 RunProgress를
          // 그대로 쓰면 된다 — 새 폴링 코드를 만들 필요가 없다. 완료 시 sonner 토스트와
          // [수집 결과 보기]/[새로 크롤링하기] 버튼, 부분 실패 시 ErrorAlert도 이 안에서 붙인다.
          <div role="status" aria-live="polite" className="space-y-2 text-sm">
            <p className="font-medium">크롤링을 실행 중입니다</p>
            <p className="font-mono text-xs text-muted-foreground">실행 ID: {runId}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
