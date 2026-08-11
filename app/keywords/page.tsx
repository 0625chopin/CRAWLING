'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Clock, Flame, Inbox, SearchX } from 'lucide-react'

import {
  KEYWORDS_FILTER_DEFAULTS,
  useKeywordsTabField,
  useKeywordsTabStateRaw,
} from '@/components/app-state-provider'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorAlert } from '@/components/common/error-alert'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { AnalysisFilterBar } from '@/components/keywords/analysis-filter-bar'
import { AnalysisProgress } from '@/components/keywords/analysis-progress'
import { AnalysisSummary } from '@/components/keywords/analysis-summary'
import { KeywordRankCardList } from '@/components/keywords/keyword-rank-card-list'
import { KeywordRankTable } from '@/components/keywords/keyword-rank-table'
import { TopKeywordCards } from '@/components/keywords/top-keyword-cards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchDailyKeywords, type DailyKeywordsResult } from '@/lib/api/keyword-client'
import { fetchRuns, type RunListItem } from '@/lib/api/run-client'
import { addStopword } from '@/lib/api/stopword-client'
import type { PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'
import { formatDateKeyLabel, getTimeSlotLabel } from '@/lib/types/time-slot'

type RunsLoadState = 'loading' | 'error' | 'ready'
type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

// 설계서 상태 ① 기본값(docs/screens/03-hot-keyword.md §상태별 화면 ①). 이 탭의 컨텍스트
// 초깃값(components/app-state-provider.tsx)과 같은 값이어야 해서 그쪽에서 가져와 별칭만 준다
// — 두 곳에 같은 숫자를 따로 적으면 한쪽만 고쳤을 때 조용히 어긋난다.
const {
  minCount: DEFAULT_MIN_COUNT,
  posFilter: DEFAULT_POS,
  topN: DEFAULT_TOP_N,
  slot: DEFAULT_SLOT,
} = KEYWORDS_FILTER_DEFAULTS

const EMPTY_RUNS: RunListItem[] = []

/** run id 앞 8자리가 곧 그 실행의 로컬 날짜다(`lib/storage/run-repository.ts`의 id 형식). */
function toDateKey(runId: string): string {
  return runId.slice(0, 8)
}

/** runs·분석 결과가 아직 없는 최초 진입 스켈레톤. useSearchParams의 Suspense fallback도 겸한다. */
function KeywordsPageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">불러오는 중</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

function KeywordsPageContent() {
  // ?runId 쿼리 — 수집 결과 페이지의 [키워드 분석] 버튼이 넘긴 값이다(useSearchParams는
  // Suspense 경계가 필요해 이 컴포넌트를 <Suspense>로 감싸 분리했다). 이 화면의 분석 단위는
  // 날짜이므로 그 run이 속한 **날짜**로 바꿔 받는다 — 링크를 고치지 않고도 "그 실행을 보던
  // 맥락"이 이어진다. 최초 1회만 읽으면 되므로 lazy state로 고정한다.
  const searchParams = useSearchParams()
  const [initialDate] = useState(() => {
    const runId = searchParams.get('runId')
    return runId ? toDateKey(runId) : null
  })

  // 탭을 옮겼다 돌아와도 날짜·시간대 선택·필터·분석 결과가 그대로 남아 있어야 한다(Task 031).
  // runs·selectedDate는 이벤트 핸들러/이펙트에서만 바뀌므로 컨텍스트에 직접 바인딩해도
  // 안전하지만, 나머지는 아래 "날짜가 바뀌면 초기화" 블록에서 렌더 도중 갱신된다 —
  // app/results/page.tsx와 같은 이유로 이 값들은 로컬 state로 유지하고 마운트 시 컨텍스트의
  // 마지막 스냅샷으로 초기화한 뒤, 언마운트 시점에만 다시 컨텍스트에 남긴다(아래 latestSnapshotRef).
  const [runsSnapshot, setRuns] = useKeywordsTabField('runs')
  const [selectedDate, setSelectedDate] = useKeywordsTabField('selectedDate')
  const { state: keywordsTabSnapshot, setState: setKeywordsTab } = useKeywordsTabStateRaw()

  const runs = runsSnapshot ?? EMPTY_RUNS
  // 이전 방문에서 받아온 스냅샷이 있으면 스켈레톤 없이 그대로 그리고 뒤에서 재조회한다(stale-while-revalidate).
  const [runsLoadState, setRunsLoadState] = useState<RunsLoadState>(() =>
    runsSnapshot !== null ? 'ready' : 'loading'
  )
  const [reloadToken, setReloadToken] = useState(0)

  // trackedDate의 초깃값을 selectedDate(컨텍스트에서 이어받은 값)와 똑같이 맞춘다 — 탭 복귀
  // 직후 첫 렌더에서 "날짜가 바뀌었다"고 오판해 아래 필터·분석 결과를 곧바로 지우지 않기 위해서다.
  const [trackedDate, setTrackedDate] = useState<string | null>(selectedDate)

  const [slot, setSlot] = useState<number | null>(() => keywordsTabSnapshot.slot)
  const [minCount, setMinCount] = useState(() => keywordsTabSnapshot.minCount)
  const [posFilter, setPosFilter] = useState<PosTag[]>(() => keywordsTabSnapshot.posFilter)
  const [topN, setTopN] = useState(() => keywordsTabSnapshot.topN)
  // 카테고리 필터(Task 028). 빈 배열 = 전체 — fetchDailyKeywords의 categories 옵션과 같은 규칙.
  const [categories, setCategories] = useState<PressCategory[]>(() => keywordsTabSnapshot.categories)

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(
    () => keywordsTabSnapshot.analysisStatus
  )
  const [result, setResult] = useState<DailyKeywordsResult | null>(
    () => keywordsTabSnapshot.result
  )
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [pendingKeyword, setPendingKeyword] = useState<string | null>(null)

  // 실행이 하루라도 있었던 날짜만 최신순으로. 같은 날 여러 번 돌린 run은 한 날짜로 합쳐진다 —
  // 이 화면이 하루치를 통째로 집계하기 때문이다(analysis-filter-bar.tsx 주석).
  const dates = useMemo(
    () => [...new Set(runs.map((run) => toDateKey(run.id)))].sort((a, b) => b.localeCompare(a)),
    [runs]
  )

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data)
        setRunsLoadState('ready')
        const available = [...new Set(data.map((run) => toDateKey(run.id)))].sort((a, b) =>
          b.localeCompare(a)
        )
        // ?runId가 가리키는 날짜(수집 결과 화면에서 넘어온 경우, 실제로 실행이 있던 날일 때만)를
        // 가장 먼저 따른다 — 명시적으로 그 실행을 보다 넘어온 것이므로 이전 방문의 선택보다
        // 우선한다. 그다음은 이전 방문에서 고른 날짜(그 사이 run이 전부 삭제되지 않았을 때만),
        // 마지막이 가장 최근 날짜다(Task 031 — 복귀 시 낡은 선택을 그대로 믿지 않는다).
        setSelectedDate((prev) => {
          if (initialDate && available.includes(initialDate)) return initialDate
          if (prev && available.includes(prev)) return prev
          return available[0] ?? null
        })
      })
      .catch(() => setRunsLoadState('error'))
  }, [reloadToken, initialDate, setRuns, setSelectedDate])

  const retryRuns = useCallback(() => {
    setRunsLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  // 날짜가 바뀌면(최초 선택 포함) 이전 날짜의 필터·분석 결과가 남지 않도록 렌더 중 즉시
  // 초기화한다(app/results/page.tsx와 같은 근거 — react-hooks/set-state-in-effect 경고를 피하며
  // "다음 페인트 전에 초기화"를 보장하는 패턴). 이 블록이 만지는 값은 전부 이 컴포넌트가 직접
  // 소유한 로컬 state뿐이다 — 컨텍스트 state는 여기서 건드리지 않는다(위 주석 참고).
  if (selectedDate !== trackedDate) {
    setTrackedDate(selectedDate)
    setSlot(DEFAULT_SLOT)
    setMinCount(DEFAULT_MIN_COUNT)
    setPosFilter(DEFAULT_POS)
    setTopN(DEFAULT_TOP_N)
    setCategories([])
    setAnalysisStatus('idle')
    setResult(null)
    setAnalysisError(null)
  }

  // 탭을 떠나는 순간(언마운트)의 최신 값을 컨텍스트에 스냅샷으로 남긴다 — 다음 방문 때 이
  // 값들로 다시 시작하기 위해서다(Task 031). 매 렌더 ref만 갱신해 두고(리렌더 유발 없음) 실제
  // 쓰기는 언마운트 시 한 번만 한다(app/results/page.tsx와 같은 이유).
  const latestSnapshotRef = useRef({
    slot,
    minCount,
    posFilter,
    topN,
    categories,
    analysisStatus,
    result,
  })
  useEffect(() => {
    latestSnapshotRef.current = { slot, minCount, posFilter, topN, categories, analysisStatus, result }
  })
  useEffect(() => {
    return () => {
      setKeywordsTab((prev) => ({ ...prev, ...latestSnapshotRef.current }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 1회에만 스냅샷을 흘려보낸다. setKeywordsTab은 안정적이다.
  }, [])

  const runAnalysis = useCallback(
    async (options: {
      slot: number | null
      minCount: number
      pos: PosTag[]
      topN: number
      force: boolean
      categories: PressCategory[]
    }) => {
      if (!selectedDate) return false
      setAnalysisStatus('loading')
      setAnalysisError(null)
      try {
        const data = await fetchDailyKeywords(selectedDate, options)
        setResult(data)
        setAnalysisStatus('success')
        return true
      } catch (error) {
        setAnalysisError(
          error instanceof Error
            ? error.message
            : '형태소 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        )
        setAnalysisStatus('error')
        return false
      }
    },
    [selectedDate]
  )

  const handleSubmit = useCallback(() => {
    void runAnalysis({ slot, minCount, pos: posFilter, topN, force: false, categories })
  }, [runAnalysis, slot, minCount, posFilter, topN, categories])

  /**
   * 시간대는 고르는 즉시 반영한다 — 하루치 집계가 이미 캐시에 있어 구간을 바꾸는 데 다시
   * 분석할 필요가 없고, "해당 시간의 집계만 본다"는 것이 이 컨트롤의 존재 이유이기 때문이다.
   * 아직 한 번도 분석하지 않았다면(`idle`) 값만 바꾸고 조회하지는 않는다 — 그 첫 조회는 하루치
   * 전체를 분석하는 무거운 작업이라 사용자가 [분석 시작]으로 명시적으로 시작해야 한다.
   */
  const handleSlotChange = useCallback(
    (nextSlot: number | null) => {
      setSlot(nextSlot)
      if (analysisStatus === 'idle') return
      void runAnalysis({ slot: nextSlot, minCount, pos: posFilter, topN, force: false, categories })
    },
    [analysisStatus, runAnalysis, minCount, posFilter, topN, categories]
  )

  // 상태 ⑤(결과 0건)의 [필터 초기화] — 기본값으로 되돌리고 즉시 재조회한다. 카테고리·시간대는
  // "필터가 과해 결과가 없다"는 시나리오의 원인이 아닐 수 있어(오히려 사용자가 의도적으로
  // 좁힌 값이다) 최소 기사 수·품사·표시 개수만 되돌린다.
  const handleResetFilters = useCallback(() => {
    setMinCount(DEFAULT_MIN_COUNT)
    setPosFilter(DEFAULT_POS)
    setTopN(DEFAULT_TOP_N)
    void runAnalysis({
      slot,
      minCount: DEFAULT_MIN_COUNT,
      pos: DEFAULT_POS,
      topN: DEFAULT_TOP_N,
      force: false,
      categories,
    })
  }, [runAnalysis, slot, categories])

  // "카테고리가 안 맞아 0건"(21일차 저장소 계층 인수인계) 전용 초기화 — minCount·품사는
  // 원인이 아니므로 건드리지 않고 카테고리만 비운다. handleResetFilters와 반대로 카테고리만
  // 되돌리는 이유는 위 주석과 같다: 서로 다른 원인에는 서로 다른 해법을 준다.
  const handleResetCategoryFilter = useCallback(() => {
    setCategories([])
    void runAnalysis({ slot, minCount, pos: posFilter, topN, force: false, categories: [] })
  }, [runAnalysis, slot, minCount, posFilter, topN])

  /** "이 시간대에 기사가 없다"의 해법은 필터가 아니라 구간을 넓히는 것이다. */
  const handleResetSlot = useCallback(() => {
    handleSlotChange(null)
  }, [handleSlotChange])

  // 랭킹 행의 Ban 버튼 — 불용어로 추가한 뒤 force=true로 다시 분석해 랭킹에서 즉시 사라지게
  // 한다(ROADMAP Task 022 구현 규칙 "클릭 시 불용어 추가 후 자동 재분석까지 이어준다").
  // 불용어가 바뀌면 하루치 캐시의 모든 버킷이 틀어지므로 여기서는 증분이 아니라 전체 재집계다
  // (`lib/keyword/daily-keywords.ts`의 stopwordSignature).
  const handleAddStopword = useCallback(
    async (keyword: string) => {
      setPendingKeyword(keyword)
      try {
        await addStopword(keyword)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '불용어 추가에 실패했습니다')
        setPendingKeyword(null)
        return
      }
      const reanalyzed = await runAnalysis({
        slot,
        minCount,
        pos: posFilter,
        topN,
        force: true,
        categories,
      })
      setPendingKeyword(null)
      if (reanalyzed) {
        toast.success(`"${keyword}"을(를) 불용어로 추가하고 다시 분석했습니다`)
      }
    },
    [runAnalysis, slot, minCount, posFilter, topN, categories]
  )

  const topItems = result?.items.slice(0, 5) ?? []
  const tableItems = result?.items ?? []
  const previousSlotLabel =
    result && result.previousSlot !== null ? (getTimeSlotLabel(result.previousSlot) ?? null) : null

  // "결과 0건"의 원인을 가른다. 순서가 곧 우선순위다 — 앞의 것이 더 근본적인 원인이라, 뒤의
  // 안내(필터를 낮춰 보라)를 먼저 보여주면 사용자가 고칠 수 없는 것을 붙들고 헛수고한다.
  // ① 이 날짜에 수집된 기사 자체가 0건(서버가 message로 알려준다).
  // ② 날짜에는 기사가 있는데 고른 구간만 0건 — 해법은 필터가 아니라 구간을 넓히는 것이다.
  // ③ 카테고리 필터가 걸려 있고 미상 때문이 아닌데 통과한 기사가 0건.
  // ④ 그 나머지 — 기사는 있는데 minCount·품사가 다 걸러낸, 원래의 일반 안내가 맞는 경우.
  const isMessageEmpty = tableItems.length === 0 && Boolean(result?.message)
  const isSlotEmpty =
    tableItems.length === 0 &&
    !result?.message &&
    result?.slot !== null &&
    result?.summary.articleCount === 0 &&
    (result?.totalArticleCount ?? 0) > 0
  const isCategoryMismatchEmpty =
    tableItems.length === 0 &&
    !result?.message &&
    !isSlotEmpty &&
    categories.length > 0 &&
    (result?.uncategorizedCount ?? 0) === 0 &&
    result?.summary.articleCount === 0

  return (
    <>
      {runsLoadState === 'error' && (
        <ErrorAlert description="실행 목록을 불러오지 못했습니다" onRetry={retryRuns} />
      )}

      {runsLoadState === 'loading' && <KeywordsPageSkeleton />}

      {/* 상태 ④ 분석할 데이터가 없는 빈 상태 */}
      {runsLoadState === 'ready' && dates.length === 0 && (
        <EmptyState
          icon={<Inbox />}
          title="수집된 데이터가 없습니다"
          description="먼저 크롤링을 실행해 기사를 수집해야 키워드를 분석할 수 있습니다"
          actionLabel="크롤링 실행하러 가기"
          actionHref="/"
        />
      )}

      {runsLoadState === 'ready' && dates.length > 0 && selectedDate && (
        <div className="space-y-6">
          {/* 상태 ⑥ 분석 실패 — 조건 바는 값 유지된 채 아래에서 다시 활성화된다 */}
          {analysisStatus === 'error' && (
            <ErrorAlert
              title="분석에 실패했습니다"
              description={
                analysisError ?? '형태소 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
              }
              onRetry={handleSubmit}
            />
          )}

          {/* ① 분석 조건 바 */}
          <AnalysisFilterBar
            dates={dates}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            slot={slot}
            onSlotChange={handleSlotChange}
            slotArticleCounts={result?.slotArticleCounts ?? null}
            minCount={minCount}
            onMinCountChange={setMinCount}
            posFilter={posFilter}
            onPosFilterChange={setPosFilter}
            topN={topN}
            onTopNChange={setTopN}
            categories={categories}
            onCategoriesChange={setCategories}
            onSubmit={handleSubmit}
            disabled={analysisStatus === 'loading'}
            hasResult={result !== null}
          />

          {/* 상태 ① 분석 전 */}
          {analysisStatus === 'idle' && (
            <EmptyState
              icon={<Flame />}
              title="아직 분석 결과가 없습니다"
              description={`[분석 시작]을 누르면 ${formatDateKeyLabel(selectedDate)}에 수집한 기사를 형태소 분석합니다. 처음 분석하는 날짜는 시간이 걸립니다.`}
            />
          )}

          {/* 상태 ② 분석 진행 중 — 처음 분석하는 날짜는 대상 기사 수를 미리 알 수 없다 */}
          {analysisStatus === 'loading' && (
            <AnalysisProgress articleCount={result?.totalArticleCount} />
          )}

          {/* 상태 ③ 분석 완료 / 상태 ⑤ 결과 0건(랭킹 표 영역만 대체) */}
          {analysisStatus === 'success' && result && (
            <>
              {/* ② 분석 요약 — 고른 시간대·카테고리 기준값이다 */}
              <AnalysisSummary summary={result.summary} />

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {formatDateKeyLabel(result.date)} 실행 {result.runCount}건을 합쳐 기사 URL 중복을
                  제거한 결과입니다(전체 {result.totalArticleCount}건).
                </p>

                {/* 발행 시각을 모르는 기사는 어느 구간에도 넣지 않는다 — 그 사실을 밝히지 않으면
                    구간 합계가 전체와 어긋나 보인다(lib/types/time-slot.ts의 resolveTimeSlotIndex). */}
                {result.unknownTimeCount > 0 && (
                  <p>
                    발행 시각을 알 수 없는 기사 {result.unknownTimeCount}건은 시간대별 집계에서
                    제외했습니다.
                  </p>
                )}

                {/* 피드에 남아 있던 전날 이전 기사 — 시(hour)만 보고 구간에 넣으면 어제 14시
                    기사가 오늘의 13~15시로 들어간다(daily-keyword-repository.ts OTHER_DATE_SLOT). */}
                {result.otherDateCount > 0 && (
                  <p>
                    다른 날 발행된 기사 {result.otherDateCount}건은 시간대별 집계에서 제외했습니다.
                  </p>
                )}

                {/* 카테고리 필터로 이 분석에서 제외된 "카테고리 미상" 기사 안내(Task 026 팀장
                    판정) — 필터를 걸었는데 랭킹이 비어 있어도 "필터가 고장났다"로 읽히지 않게 한다. */}
                {categories.length > 0 && result.uncategorizedCount > 0 && (
                  <p>카테고리 미상 {result.uncategorizedCount}건은 이 분석에서 제외했습니다.</p>
                )}

                {/* 첫 구간에는 같은 날 안에 비교 대상이 없다 — 증감 열을 그리지 않은 이유를 말해준다. */}
                {result.slot !== null && result.previousSlot === null && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden="true" />
                    {getTimeSlotLabel(result.slot)}는 하루의 첫 구간이라 비교할 직전 시간대가
                    없습니다.
                  </p>
                )}
              </div>

              {topItems.length > 0 && (
                <section aria-label="Top 5 핫 키워드">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Flame className="text-muted-foreground" aria-hidden="true" />
                      Top 5 핫 키워드
                    </h2>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/stopwords">
                        불용어 관리로 이동
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                  <TopKeywordCards items={topItems} hasPreviousSlot={previousSlotLabel !== null} />
                </section>
              )}

              {tableItems.length > 0 ? (
                <>
                  <KeywordRankTable
                    items={tableItems}
                    previousSlotLabel={previousSlotLabel}
                    onAddStopword={handleAddStopword}
                    pendingKeyword={pendingKeyword}
                  />
                  <KeywordRankCardList
                    items={tableItems}
                    previousSlotLabel={previousSlotLabel}
                    onAddStopword={handleAddStopword}
                    pendingKeyword={pendingKeyword}
                  />
                </>
              ) : isMessageEmpty ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">키워드 랭킹</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 원본 기사 자체가 0건이다 — 필터를 아무리 만져도 나오지 않으므로
                        [필터 초기화] 같은 액션을 주지 않는다. description은 서버가 이미 만들어
                        보낸 result.message를 그대로 쓴다(CONVENTIONS §7 — 서버가 다듬은 한국어
                        메시지를 화면이 다시 짓지 않는다). */}
                    <EmptyState
                      icon={<Inbox />}
                      title="수집된 기사가 없습니다"
                      description={result.message ?? ''}
                    />
                  </CardContent>
                </Card>
              ) : isSlotEmpty ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">키워드 랭킹</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 이 날짜에 기사는 있는데 고른 구간만 비어 있다 — 최소 기사 수를 낮춰도
                        나오지 않는다. 크롤을 그 시간대에 돌리지 않았거나 그 시간에 발행된 기사가
                        피드에 없었던 경우다. */}
                    <EmptyState
                      icon={<Clock />}
                      title="이 시간대에는 기사가 없습니다"
                      description={`${getTimeSlotLabel(result.slot ?? 0) ?? ''}에 발행된 기사가 이 날짜 데이터에 없습니다. 다른 시간대를 고르거나 전체 시간대로 보세요.`}
                      actionLabel="전체 시간대 보기"
                      onAction={handleResetSlot}
                    />
                  </CardContent>
                </Card>
              ) : isCategoryMismatchEmpty ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">키워드 랭킹</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* minCount·품사가 원인이 아니라 카테고리 선택이 원인이다 — "필터 초기화"로
                        같은 문구를 쓰면 사용자가 최소 기사 수를 만지느라 헛수고한다. */}
                    <EmptyState
                      icon={<SearchX />}
                      title="선택한 카테고리에 해당하는 기사가 없습니다"
                      description="이 날짜에는 고른 카테고리의 기사가 없습니다. 다른 카테고리를 선택하거나 카테고리 필터를 해제해 보세요."
                      actionLabel="카테고리 필터 해제"
                      onAction={handleResetCategoryFilter}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">키워드 랭킹</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      icon={<SearchX />}
                      title="조건에 맞는 키워드가 없습니다"
                      description="최소 기사 수를 낮추거나 품사 필터 범위를 넓혀서 다시 시도해 보세요"
                      actionLabel="필터 초기화"
                      onAction={handleResetFilters}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}

export default function KeywordsPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '핫 키워드 분석' }]}
        title="핫 키워드 분석"
        description="하루치 기사를 시간대 구간별로 모아, 그 키워드를 언급한 기사 수로 랭킹을 매기고 직전 구간 대비 증감을 함께 보여줍니다"
      />
      {/* useSearchParams를 쓰는 하위 트리만 Suspense로 감싼다(Next.js 16 권장 패턴) —
          정적 프리렌더 시 이 부분만 클라이언트 렌더로 빠지고 헤더는 그대로 프리렌더된다. */}
      <Suspense fallback={<KeywordsPageSkeleton />}>
        <KeywordsPageContent />
      </Suspense>
    </PageContainer>
  )
}
