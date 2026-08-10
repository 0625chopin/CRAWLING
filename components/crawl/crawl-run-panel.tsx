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
import { PRESS_CATEGORY_LABELS, type PressCategory } from '@/lib/types/press'

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
  /**
   * pressId → 카테고리 조회용 맵(Task 028). RunProgress에는 카테고리가 없어(크롤 파이프라인
   * 소유 스키마, 이 회차 범위 밖) app/page.tsx가 이미 들고 있는 pressList에서 만들어 내려준다.
   */
  categoryByPressId: ReadonlyMap<string, PressCategory>
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
  categoryByPressId,
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
          <RunningPanel
            progress={progress}
            isAborting={isAborting}
            onAbort={handleAbort}
            categoryByPressId={categoryByPressId}
          />
        ) : (
          <DonePanel
            runId={runId}
            progress={progress}
            onReset={onReset}
            categoryByPressId={categoryByPressId}
          />
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
  categoryByPressId,
}: {
  progress: RunProgress
  isAborting: boolean
  onAbort: () => void
  categoryByPressId: ReadonlyMap<string, PressCategory>
}) {
  // pressStatuses에는 pressId가 있지만 progress.currentPressName은 이름뿐이라, 지금 진행 중인
  // 항목(status: 'running')을 찾아 그 pressId로 카테고리를 조회한다(Task 028).
  const runningItem = progress.pressStatuses.find((item) => item.status === 'running')
  const currentCategory = runningItem ? categoryByPressId.get(runningItem.pressId) : undefined

  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>전체 진행률</span>
        <span>{progress.overallPercent}%</span>
      </div>
      <Progress value={progress.overallPercent} className="h-2" />
      <p className="text-sm text-muted-foreground">
        {progress.currentPressName
          ? `현재: ${progress.currentPressName}${
              currentCategory ? ` · ${PRESS_CATEGORY_LABELS[currentCategory]}` : ''
            } — ${progress.currentCollected}/${progress.currentTarget}건`
          : '다음 언론사를 준비하는 중입니다'}
      </p>

      <Separator />

      <PressRunStatusList
        pressStatuses={progress.pressStatuses}
        recovered={progress.recovered}
        categoryByPressId={categoryByPressId}
      />

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
  categoryByPressId,
}: {
  runId: string
  progress: RunProgress
  onReset: () => void
  categoryByPressId: ReadonlyMap<string, PressCategory>
}) {
  const { status, pressStatuses, successCount, failCount, skippedCount } = progress
  const isAborted = status === 'aborted'
  const hasFailures = status === 'partial-failed' || status === 'failed'

  const totalPressCount = pressStatuses.length
  const fullyDoneCount = pressStatuses.filter(
    (item) => item.status === 'done' && item.collected === item.target
  ).length
  const successPressCount = pressStatuses.filter((item) => item.status === 'done').length
  const failedPresses = pressStatuses.filter((item) => item.status === 'failed')

  // run 상태(partial-failed/failed)를 정하는 finishRun의 failCount는 **기사 단위** 실패 건수이고,
  // failedPressCount는 **언론사 단위**다(I-040). 한 언론사 안에서 기사 몇 건만 실패하고 나머지는
  // 저장에 성공하면 그 언론사는 'done'인데 run은 hasFailures가 되므로, "실패한 언론사가 있다"는
  // 말을 failCount로 해서는 안 된다.
  //
  // 이 값을 pressStatuses에서 직접 세지 않고 서버가 준 숫자를 쓰는 이유: 서버 재시작 뒤 근사
  // 복원 경로에서는 실패한 언론사가 'waiting'으로 보여, 세어 보면 늘 0곳이 나온다. 서버는 그
  // 경우 0 대신 undefined를 보내 "알 수 없다"를 구분해 준다 — 아래 세 갈래가 그것이다.
  const failedPressCount = progress.failedPressCount
  const isPressUnitKnown = failedPressCount !== undefined
  const hasFailedPresses = isPressUnitKnown && failedPressCount > 0

  const heading = isAborted ? '크롤링 중단됨' : hasFailures ? '크롤링 완료 (일부 실패)' : '크롤링 완료'

  const summary = isAborted
    ? `${fullyDoneCount}/${totalPressCount}개 언론사 완료 · 기사 ${successCount}건 저장 · ${skippedCount}건 미수집`
    : hasFailedPresses
      ? `${successPressCount}개 성공 · ${failedPressCount}개 실패 · 기사 ${successCount}건 저장`
      : hasFailures
        ? `${totalPressCount}개 언론사 · 기사 ${successCount}건 저장 · ${failCount}건 개별 실패`
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
          title={
            hasFailedPresses
              ? `${failedPressCount}개 언론사 수집 실패`
              : `기사 ${failCount}건 개별 수집 실패`
          }
          description={
            hasFailedPresses
              ? // failReason은 서버가 수집 방식(RSS/HTML)에 맞는 문구로 이미 만들어 보낸다
                // (docs/screens/01-crawl-run.md §상태별 화면 ⑤) — 여기서 다시 분기하지 않고 그대로 쓴다.
                failedPresses
                  .map((item) => `${item.name}(${item.failReason ?? '알 수 없는 오류'})`)
                  .join(', ')
              : isPressUnitKnown
                ? // 이 분기는 죽은 코드가 아니다 — run 상태(partial-failed/failed)를 정하는
                  // finishRun의 failCount는 기사 단위 실패 건수라, 언론사 자체는 하나도 전체
                  // 실패하지 않았는데도 개별 기사만 몇 건 실패하면 여기 도달한다(I-040).
                  // "언론사가 실패했다"는 말을 쓰지 않아야 한다 — 언론사 목록은 전부 'done'으로
                  // 보일 것이기 때문이다. 서버가 언론사 단위 실패 0곳임을 확정해 줬을 때만 쓴다.
                  `언론사는 모두 정상 처리됐지만, 개별 기사 ${failCount}건이 수집에 실패했습니다.`
                : // 근사 복원 스냅샷이라 언론사 단위 실패 수를 알 수 없다. 예전에는 이 경우에도
                  // 위 문구를 써서 "언론사는 모두 정상"이라고 단정했는데, 그 경로의 언론사 상태는
                  // 저장된 기사 개수로 되짚은 근사라 실패한 언론사가 '대기'로 보일 뿐이다 —
                  // 모르는 것을 아는 것처럼 말하지 않는다.
                  `기사 ${failCount}건이 수집에 실패했습니다. 서버가 재시작되어 어느 언론사에서 실패했는지는 복구하지 못했습니다.`
          }
        />
      )}

      {(hasFailures || isAborted) && (
        <>
          <Separator />
          <PressRunStatusList
            pressStatuses={pressStatuses}
            recovered={progress.recovered}
            categoryByPressId={categoryByPressId}
          />
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
