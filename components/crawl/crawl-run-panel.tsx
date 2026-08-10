'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, CircleCheckBig, Play, Settings2, Square } from 'lucide-react'

import { ErrorAlert } from '@/components/common/error-alert'
import { PressRunStatusList } from '@/components/crawl/press-run-status-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useCrawlProgress } from '@/hooks/use-crawl-progress'
import { abortCrawl } from '@/lib/api/crawl-client'
import type { RunProgress } from '@/lib/types/crawl-run'

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
  /**
   * 완료/부분 실패/중단 화면의 [새로 크롤링하기]. runId를 null로, 선택 상태를 빈 Set으로
   * 되돌리는 것은 app/page.tsx가 쥔 상태라 그 두 값을 초기화하는 핸들러 하나만 받는다
   * (D-006 — 이 회차는 app/page.tsx를 재구조화하지 않는다).
   */
  onReset: () => void
}

const TERMINAL_TOAST_STATUSES = new Set<RunProgress['status']>([
  'done',
  'partial-failed',
  'failed',
  'aborted',
])

/**
 * ③④⑤⑧ 크롤링 옵션 & 실행/진행/완료/부분 실패/중단 패널(`docs/screens/01-crawl-run.md`,
 * `docs/DECISIONS.md` D-011·D-030). 016A가 옵션 입력·실행 버튼·"실행 중" 최소 표시까지
 * 채워 두었고, 이 회차(016B)가 진행 중·완료·부분 실패·중단 조각을 채운다. 진행 상태는
 * `hooks/use-crawl-progress.ts`(Task 015B)가 이미 폴링해 돌려주는 `RunProgress` 하나만 쓴다 —
 * 이 컴포넌트가 `GET /api/crawl/{runId}`를 직접 호출하지 않는다.
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
  onReset,
}: CrawlRunPanelProps) {
  const canStart = !isRunning && !isStarting && !isPressEmpty && selectedCount > 0
  const { progress, error: progressError } = useCrawlProgress(runId)
  const [isAborting, setIsAborting] = useState(false)

  const handleAbort = useCallback(async () => {
    if (!runId) return
    setIsAborting(true)
    try {
      await abortCrawl(runId)
    } catch (error) {
      // fail()이 만든 메시지는 이미 한국어라 그대로 노출해도 된다(docs/CONVENTIONS.md §6).
      toast.error(error instanceof Error ? error.message : '크롤링 중단에 실패했습니다')
    } finally {
      setIsAborting(false)
    }
  }, [runId])

  // 종료 상태에 처음 닿는 순간에만 토스트를 띄운다 — 의존 배열을 status 값 자체로 좁혀서,
  // 이미 종료 상태인 채로 부모가 리렌더돼도(폴링은 이미 멈췄다) 다시 뜨지 않는다.
  useEffect(() => {
    if (!progress || !TERMINAL_TOAST_STATUSES.has(progress.status)) return

    if (progress.status === 'done') {
      toast.success(`크롤링 완료 — 기사 ${progress.successCount}건 저장`)
    } else if (progress.status === 'aborted') {
      // 사용자가 스스로 누른 중단이지 오류가 아니므로 destructive가 아니라 warning 톤이다(D-030).
      toast.warning(
        `크롤링 중단됨 — 기사 ${progress.successCount}건 저장, ${progress.skippedCount}건 미수집`
      )
    } else {
      const failedPressCount = progress.pressStatuses.filter((item) => item.status === 'failed').length
      toast.warning(`크롤링 완료 — ${failedPressCount}개 언론사 실패`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- status 값 자체가 "종료 시점 1회"를 가르는 키다.
  }, [progress?.status])

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

        {runId === null ? (
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
        ) : !progress ? (
          // 첫 폴링 응답이 아직 오지 않은 찰나 — runId는 이미 받았지만 진행 상태는 모른다.
          <div role="status" aria-live="polite" className="space-y-2 text-sm">
            <p className="font-medium text-muted-foreground">크롤링을 준비하는 중입니다…</p>
            {progressError && <p className="text-xs text-muted-foreground">{progressError}</p>}
          </div>
        ) : progress.status === 'running' ? (
          <RunningPanel progress={progress} isAborting={isAborting} onAbort={handleAbort} />
        ) : (
          <DonePanel runId={runId} progress={progress} onReset={onReset} />
        )}
      </CardContent>
    </Card>
  )
}

/** ③ 크롤링 진행 중(`docs/screens/01-crawl-run.md` §상태별 화면 ③). */
function RunningPanel({
  progress,
  isAborting,
  onAbort,
}: {
  progress: RunProgress
  isAborting: boolean
  onAbort: () => void
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>전체 진행률</span>
        <span>{progress.overallPercent}%</span>
      </div>
      <Progress value={progress.overallPercent} className="h-2" />
      <p className="text-sm text-muted-foreground">
        {progress.currentPressName
          ? `현재: ${progress.currentPressName} — ${progress.currentCollected}/${progress.currentTarget}건`
          : '다음 언론사를 준비하는 중입니다'}
      </p>

      <Separator />

      <PressRunStatusList pressStatuses={progress.pressStatuses} recovered={progress.recovered} />

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isAborting}
        onClick={onAbort}
      >
        <Square aria-hidden="true" />
        {isAborting ? '중단하는 중…' : '중단'}
      </Button>
    </div>
  )
}

/**
 * ④ 완료 / ⑤ 부분 실패 / ⑧ 중단됨을 한 조각으로 그린다. 설계서가 ⑧을 "완료 조각을 그대로
 * 재사용하고 status로 아이콘·문구·톤만 갈아 끼운다"고 못박아 두었다(D-030 결정 1) — ④와 ⑧이
 * 레이아웃이 완전히 같으므로 별도 컴포넌트로 쪼개지 않는다. `status: 'failed'`(전체 실패,
 * successCount 0건)는 설계서에 전용 상태가 없어, failCount > 0이라는 같은 조건을 공유하는
 * ⑤ 부분 실패 마크업(요약 + destructive Alert + 언론사별 리스트)을 그대로 재사용한다 —
 * 실패 전용 새 UI를 지어내지 않는다.
 */
function DonePanel({
  runId,
  progress,
  onReset,
}: {
  runId: string
  progress: RunProgress
  onReset: () => void
}) {
  const { status, pressStatuses, successCount, skippedCount } = progress
  const isAborted = status === 'aborted'
  const hasFailures = status === 'partial-failed' || status === 'failed'

  const totalPressCount = pressStatuses.length
  const fullyDoneCount = pressStatuses.filter(
    (item) => item.status === 'done' && item.collected === item.target
  ).length
  const successPressCount = pressStatuses.filter((item) => item.status === 'done').length
  const failedPresses = pressStatuses.filter((item) => item.status === 'failed')

  const heading = isAborted ? '크롤링 중단됨' : hasFailures ? '크롤링 완료 (일부 실패)' : '크롤링 완료'

  const summary = isAborted
    ? `${fullyDoneCount}/${totalPressCount}개 언론사 완료 · 기사 ${successCount}건 저장 · ${skippedCount}건 미수집`
    : hasFailures
      ? `${successPressCount}개 성공 · ${failedPresses.length}개 실패 · 기사 ${successCount}건 저장`
      : `${totalPressCount}개 언론사 · 기사 ${successCount}건 저장`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {isAborted ? (
          <Square className="size-4" aria-hidden="true" />
        ) : (
          <CircleCheckBig className="size-4" aria-hidden="true" />
        )}
        {heading}
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
      <p className="font-mono text-xs text-muted-foreground">{`data/runs/${runId}/articles/`}</p>

      {hasFailures && (
        <ErrorAlert
          title={`${failedPresses.length}개 언론사 수집 실패`}
          description={
            failedPresses.length > 0
              ? // failReason은 서버가 수집 방식(RSS/HTML)에 맞는 문구로 이미 만들어 보낸다
                // (docs/screens/01-crawl-run.md §상태별 화면 ⑤) — 여기서 다시 분기하지 않고 그대로 쓴다.
                failedPresses
                  .map((item) => `${item.name}(${item.failReason ?? '알 수 없는 오류'})`)
                  .join(', ')
              : // run 상태(partial-failed/failed)는 언론사 단위가 아니라 기사 단위 실패 건수로도
                // 갈릴 수 있어(lib/storage/run-repository.ts의 finishRun), 개별 기사만 실패하고
                // 언론사 자체는 'done'으로 끝나는 경우 failedPresses가 빌 수 있다 — 도달 가능한 분기다.
                '수집에 실패한 언론사가 있습니다.'
          }
        />
      )}

      {(hasFailures || isAborted) && (
        <>
          <Separator />
          <PressRunStatusList pressStatuses={pressStatuses} recovered={progress.recovered} />
        </>
      )}

      <Separator />

      <Button asChild className="w-full">
        <Link href="/results">
          수집 결과 보기
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onReset}>
        새로 크롤링하기
      </Button>
    </div>
  )
}
