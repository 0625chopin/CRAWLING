'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Flame, Inbox, SearchX } from 'lucide-react'

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
import { fetchKeywords, type KeywordsResult } from '@/lib/api/keyword-client'
import { fetchRuns, type RunListItem } from '@/lib/api/run-client'
import { addStopword } from '@/lib/api/stopword-client'
import type { PosTag } from '@/lib/types/keyword'

type RunsLoadState = 'loading' | 'error' | 'ready'
type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

// 설계서 상태 ① 기본값(docs/screens/03-hot-keyword.md §상태별 화면 ①).
const DEFAULT_MIN_COUNT = 1
const DEFAULT_POS: PosTag[] = ['NNG', 'NNP', 'SL']
const DEFAULT_TOP_N = 50

// selectedRunId가 한 번도 추적되지 않았음을 나타내는 표식(app/results/page.tsx와 같은 패턴).
// 최초 렌더에서도 "바뀌었다" 분기를 확실히 태워, 필터·분석 결과가 초기화되게 한다.
const UNSET: unique symbol = Symbol('keywords-run-unset')

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
  // Suspense 경계가 필요해 이 컴포넌트를 <Suspense>로 감싸 분리했다). 최초 1회만 읽으면
  // 되므로 lazy state로 고정해 이후 렌더에서 searchParams 변화에 다시 반응하지 않는다.
  const searchParams = useSearchParams()
  const [initialRunId] = useState(() => searchParams.get('runId'))

  const [runsLoadState, setRunsLoadState] = useState<RunsLoadState>('loading')
  const [runs, setRuns] = useState<RunListItem[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [trackedRunId, setTrackedRunId] = useState<string | null | typeof UNSET>(UNSET)

  const [minCount, setMinCount] = useState(DEFAULT_MIN_COUNT)
  const [posFilter, setPosFilter] = useState<PosTag[]>(DEFAULT_POS)
  const [topN, setTopN] = useState(DEFAULT_TOP_N)

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState<KeywordsResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [pendingKeyword, setPendingKeyword] = useState<string | null>(null)

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data)
        setRunsLoadState('ready')
        // 최초 로드에서만 ?runId(존재하는 run일 때만) 또는 최신 실행을 기본 선택한다.
        setSelectedRunId((prev) => {
          if (prev) return prev
          if (initialRunId && data.some((run) => run.id === initialRunId)) return initialRunId
          return data[0]?.id ?? null
        })
      })
      .catch(() => setRunsLoadState('error'))
  }, [reloadToken, initialRunId])

  const retryRuns = useCallback(() => {
    setRunsLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  // run이 바뀌면(최초 선택 포함) 이전 run의 필터·분석 결과가 남지 않도록 렌더 중 즉시
  // 초기화한다(app/results/page.tsx와 같은 근거 — react-hooks/set-state-in-effect 경고를 피하며
  // "다음 페인트 전에 초기화"를 보장하는 패턴).
  if (selectedRunId !== trackedRunId) {
    setTrackedRunId(selectedRunId)
    setMinCount(DEFAULT_MIN_COUNT)
    setPosFilter(DEFAULT_POS)
    setTopN(DEFAULT_TOP_N)
    setAnalysisStatus('idle')
    setResult(null)
    setAnalysisError(null)
  }

  const runAnalysis = useCallback(
    async (options: { minCount: number; pos: PosTag[]; topN: number; force: boolean }) => {
      if (!selectedRunId) return false
      setAnalysisStatus('loading')
      setAnalysisError(null)
      try {
        const data = await fetchKeywords(selectedRunId, options)
        setResult(data)
        setAnalysisStatus('success')
        return true
      } catch (error) {
        setAnalysisError(
          error instanceof Error ? error.message : '형태소 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        )
        setAnalysisStatus('error')
        return false
      }
    },
    [selectedRunId]
  )

  // [분석 시작]/[재분석] — 캐시 위에서 필터만 다시 적용하는 조회다. Kiwi를 다시 돌리는 것은
  // force=true뿐이고, 그건 불용어 추가 직후(handleAddStopword)에만 자동으로 붙는다
  // (docs/ROADMAP.md Task 021 구현 규칙 "캐시와 재분석의 경계").
  const handleSubmit = useCallback(() => {
    void runAnalysis({ minCount, pos: posFilter, topN, force: false })
  }, [runAnalysis, minCount, posFilter, topN])

  // 상태 ⑤(결과 0건)의 [필터 초기화] — 기본값으로 되돌리고 즉시 재조회한다.
  const handleResetFilters = useCallback(() => {
    setMinCount(DEFAULT_MIN_COUNT)
    setPosFilter(DEFAULT_POS)
    setTopN(DEFAULT_TOP_N)
    void runAnalysis({
      minCount: DEFAULT_MIN_COUNT,
      pos: DEFAULT_POS,
      topN: DEFAULT_TOP_N,
      force: false,
    })
  }, [runAnalysis])

  // 랭킹 행의 Ban 버튼 — 불용어로 추가한 뒤 force=true로 다시 분석해 랭킹에서 즉시 사라지게
  // 한다(ROADMAP Task 022 구현 규칙 "클릭 시 불용어 추가 후 자동 재분석까지 이어준다").
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
      const reanalyzed = await runAnalysis({ minCount, pos: posFilter, topN, force: true })
      setPendingKeyword(null)
      if (reanalyzed) {
        toast.success(`"${keyword}"을(를) 불용어로 추가하고 다시 분석했습니다`)
      }
    },
    [runAnalysis, minCount, posFilter, topN]
  )

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null
  const topItems = result?.items.slice(0, 5) ?? []
  const tableItems = result?.items ?? []

  return (
    <>
      {runsLoadState === 'error' && (
        <ErrorAlert description="실행 목록을 불러오지 못했습니다" onRetry={retryRuns} />
      )}

      {runsLoadState === 'loading' && <KeywordsPageSkeleton />}

      {/* 상태 ④ 분석할 run이 없는 빈 상태 */}
      {runsLoadState === 'ready' && runs.length === 0 && (
        <EmptyState
          icon={<Inbox />}
          title="수집된 데이터가 없습니다"
          description="먼저 크롤링을 실행해 기사를 수집해야 키워드를 분석할 수 있습니다"
          actionLabel="크롤링 실행하러 가기"
          actionHref="/"
        />
      )}

      {runsLoadState === 'ready' && runs.length > 0 && selectedRunId && (
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
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectedRunIdChange={setSelectedRunId}
            minCount={minCount}
            onMinCountChange={setMinCount}
            posFilter={posFilter}
            onPosFilterChange={setPosFilter}
            topN={topN}
            onTopNChange={setTopN}
            onSubmit={handleSubmit}
            disabled={analysisStatus === 'loading'}
            hasResult={result !== null}
          />

          {/* 상태 ① 분석 전 */}
          {analysisStatus === 'idle' && (
            <EmptyState
              icon={<Flame />}
              title="아직 분석 결과가 없습니다"
              description="[분석 시작]을 누르면 이 run의 기사 본문을 형태소 분석합니다."
            />
          )}

          {/* 상태 ② 분석 진행 중 */}
          {analysisStatus === 'loading' && (
            <AnalysisProgress articleCount={selectedRun?.successCount ?? 0} />
          )}

          {/* 상태 ③ 분석 완료 / 상태 ⑤ 결과 0건(랭킹 표 영역만 대체) */}
          {analysisStatus === 'success' && result && (
            <>
              {/* ② 분석 요약 — summary는 필터에 흔들리지 않는 전체 기준값이라 항상 그대로 보여준다 */}
              <AnalysisSummary summary={result.summary} />

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
                  <TopKeywordCards items={topItems} />
                </section>
              )}

              {tableItems.length > 0 ? (
                <>
                  <KeywordRankTable
                    items={tableItems}
                    onAddStopword={handleAddStopword}
                    pendingKeyword={pendingKeyword}
                  />
                  <KeywordRankCardList
                    items={tableItems}
                    onAddStopword={handleAddStopword}
                    pendingKeyword={pendingKeyword}
                  />
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">키워드 랭킹</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      icon={<SearchX />}
                      title="조건에 맞는 키워드가 없습니다"
                      description="최소 등장 횟수를 낮추거나 품사 필터 범위를 넓혀서 다시 시도해 보세요"
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
        description="형태소 분석으로 조사·어미를 제거하고 명사·영문 키워드의 등장 빈도를 랭킹으로 보여줍니다"
      />
      {/* useSearchParams를 쓰는 하위 트리만 Suspense로 감싼다(Next.js 16 권장 패턴) —
          정적 프리렌더 시 이 부분만 클라이언트 렌더로 빠지고 헤더는 그대로 프리렌더된다. */}
      <Suspense fallback={<KeywordsPageSkeleton />}>
        <KeywordsPageContent />
      </Suspense>
    </PageContainer>
  )
}
