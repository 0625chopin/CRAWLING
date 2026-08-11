'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Inbox } from 'lucide-react'

import { useResultsTabField, useResultsTabStateRaw } from '@/components/app-state-provider'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorAlert } from '@/components/common/error-alert'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { ArticleFileList } from '@/components/results/article-file-list'
import { ArticlePreview } from '@/components/results/article-preview'
import { RunSelect } from '@/components/results/run-select'
import { RunSummaryCard } from '@/components/results/run-summary-card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchRunSummary,
  fetchRuns,
  type RunListItem,
  type RunSummary,
} from '@/lib/api/run-client'
import type { PressCategory } from '@/lib/types/press'

type RunsLoadState = 'loading' | 'error' | 'ready'

const EMPTY_RUNS: RunListItem[] = []

export default function CollectResultPage() {
  // 탭을 옮겼다 돌아와도 실행 선택·검색어·선택 기사·카테고리 필터·요약 스냅샷이 그대로 남아
  // 있어야 한다(Task 031). runs·selectedRunId는 이벤트 핸들러/이펙트에서만 바뀌므로 컨텍스트에
  // 직접 바인딩해도 안전하지만, summary·selectedArticleId·categories·query는 아래 "run이 바뀌면
  // 초기화" 블록에서 렌더 도중 갱신된다 — 그 블록이 다른 컴포넌트(AppStateProvider) 소유의
  // state를 렌더 중에 건드리면 "Cannot update a component while rendering a different
  // component" 콘솔 경고가 뜬다(hooks/use-crawl-progress.ts와 같은 함정, Task 031 특히 조심할
  // 것 ⑥). 그래서 이 네 값은 로컬 state로 유지하고, 마운트 시 컨텍스트의 마지막 스냅샷으로
  // 초기화한 뒤 언마운트(탭 이동) 시점에만 최신값을 다시 컨텍스트에 남긴다(아래 latestSnapshotRef).
  const [runsSnapshot, setRuns] = useResultsTabField('runs')
  const [selectedRunId, setSelectedRunId] = useResultsTabField('selectedRunId')
  const { state: resultsTabSnapshot, setState: setResultsTab } = useResultsTabStateRaw()

  const runs = runsSnapshot ?? EMPTY_RUNS
  // 이전 방문에서 받아온 스냅샷이 있으면 스켈레톤 없이 그대로 그리고 뒤에서 재조회한다(stale-while-revalidate).
  const [runsLoadState, setRunsLoadState] = useState<RunsLoadState>(() =>
    runsSnapshot !== null ? 'ready' : 'loading'
  )
  // "다시 시도" 버튼이 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다
  // (app/press/page.tsx·app/page.tsx와 같은 패턴).
  const [reloadToken, setReloadToken] = useState(0)

  const [summary, setSummary] = useState<RunSummary | null>(() => resultsTabSnapshot.summary)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  // trackedRunId의 초깃값을 selectedRunId(컨텍스트에서 이어받은 값)와 똑같이 맞춘다 — 그래야
  // 탭 복귀 직후 첫 렌더에서 "run이 바뀌었다"고 오판해 아래 스냅샷들(요약·선택 기사·필터)을
  // 곧바로 지워버리지 않는다. run이 실제로 바뀔 때만 아래 블록이 초기화를 수행한다.
  const [trackedRunId, setTrackedRunId] = useState<string | null>(selectedRunId)
  // 선택된 기사 id. article-file-list.tsx·article-preview.tsx(018B)가 공유해야 하는 형제 간
  // 상태라 이 페이지가 쥔다(016A의 selectedIds·runId와 같은 이유) — 018B는 컴포넌트 내부만
  // 채우면 되고 이 파일을 다시 열 필요가 없다(D-006, 11일차 교차검증 반영).
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    () => resultsTabSnapshot.selectedArticleId
  )
  const handleSelectArticleId = useCallback((articleId: string) => {
    setSelectedArticleId(articleId)
  }, [])
  // 카테고리 필터(Task 028). article-file-list.tsx와 run-summary-card.tsx가 공유해야 하는
  // 값이라(목록을 좁히는 동시에 요약 카드에 "지금 보는 범위"를 보여준다) 이 페이지가 쥔다 —
  // selectedArticleId와 같은 이유(D-006 패턴).
  const [categories, setCategories] = useState<PressCategory[]>(
    () => resultsTabSnapshot.categories
  )
  // 기사 검색 Input의 값(Task 029). article-file-list.tsx(검색 대상·디바운스 fetch)와
  // article-preview.tsx(제목·본문 하이라이트)가 같은 값을 봐야 화면 두 곳의 강조가 어긋나지
  // 않는다 — categories·selectedArticleId와 같은 이유로 이 페이지가 쥔다(D-006 패턴).
  const [query, setQuery] = useState(() => resultsTabSnapshot.query)

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data)
        setRunsLoadState('ready')
        // 최초 로드에서만 최신 실행(목록 첫 항목, listRuns가 이미 내림차순 정렬)을 기본
        // 선택한다. 이전 방문에서 고른 실행(prev)이 있으면 우선하되, 그 사이 삭제됐을 수
        // 있어 목록에 실제로 남아 있는지 확인한다(Task 031 — 복귀 시 낡은 선택을 그대로
        // 믿지 않는다).
        setSelectedRunId((prev) => {
          if (prev && data.some((run) => run.id === prev)) return prev
          return data[0]?.id ?? null
        })
      })
      .catch(() => setRunsLoadState('error'))
  }, [reloadToken, setRuns, setSelectedRunId])

  const retry = useCallback(() => {
    setRunsLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  // selectedRunId가 바뀌면(최초 선택 포함) 이전 실행의 요약·오류가 남지 않도록 렌더 도중 즉시
  // 초기화한다. useEffect 본문에서 무조건 setState를 부르면 커밋마다 렌더가 한 번 더 발생한다는
  // 린트 경고(react-hooks/set-state-in-effect)가 있어, "prop이 바뀔 때 state를 조정하는" 렌더 중
  // 처리 패턴을 쓴다(hooks/use-crawl-progress.ts와 동일한 근거). 이 블록이 만지는 값은 전부
  // 이 컴포넌트가 직접 소유한 로컬 state뿐이다 — 위 주석대로 컨텍스트 state는 여기서 건드리지
  // 않는다.
  if (selectedRunId !== trackedRunId) {
    setTrackedRunId(selectedRunId)
    setSummary(null)
    setSummaryError(null)
    setSelectedArticleId(null)
    setCategories([])
    setQuery('')
  }

  useEffect(() => {
    if (!selectedRunId) return
    let cancelled = false
    fetchRunSummary(selectedRunId)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setSummaryError(
            error instanceof Error ? error.message : '실행 요약을 불러오지 못했습니다'
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedRunId])

  // 탭을 떠나는 순간(언마운트)의 최신 값을 컨텍스트에 스냅샷으로 남긴다 — 다음 방문 때 이
  // 값들로 다시 시작하기 위해서다(Task 031). 매 렌더 ref만 갱신해 두고(리렌더 유발 없음) 실제
  // 쓰기는 언마운트 시 한 번만 한다 — 타이핑 중 계속 컨텍스트에 쓰면 이 페이지가 불필요하게
  // 더 리렌더된다(구현 규칙 경고 "컨텍스트 value를 매 렌더 새로 만들지 않는다"와 같은 이유).
  const latestSnapshotRef = useRef({ selectedArticleId, categories, query, summary })
  useEffect(() => {
    latestSnapshotRef.current = { selectedArticleId, categories, query, summary }
  })
  useEffect(() => {
    return () => {
      setResultsTab((prev) => ({ ...prev, ...latestSnapshotRef.current }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 1회에만 스냅샷을 흘려보낸다. setResultsTab은 안정적이다.
  }, [])

  return (
    // PageContainer가 <main className="flex-1">과 container 클래스를 모두 제공한다.
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '수집 결과' }]}
        title="수집 결과"
        description="크롤링으로 저장된 기사 txt 결과를 실행(run) 단위로 확인합니다."
      />

      {runsLoadState === 'error' && (
        <ErrorAlert description="실행 목록을 불러오지 못했습니다" onRetry={retry} />
      )}

      {runsLoadState === 'loading' && (
        <div className="space-y-6" aria-busy="true" aria-label="수집 결과 불러오는 중">
          <Skeleton className="h-8 w-[340px]" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-[28rem] w-full" />
            <Skeleton className="h-[28rem] w-full" />
          </div>
        </div>
      )}

      {runsLoadState === 'ready' && runs.length === 0 && (
        <EmptyState
          icon={<Inbox />}
          title="아직 크롤링한 결과가 없습니다"
          description="크롤링 실행 화면에서 언론사를 선택해 첫 수집을 시작하세요"
          actionLabel="크롤링 실행하러 가기"
          actionHref="/"
        />
      )}

      {runsLoadState === 'ready' && runs.length > 0 && selectedRunId && (
        <div className="space-y-6">
          {/* ② 실행 선택 */}
          <RunSelect
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectedRunIdChange={setSelectedRunId}
          />

          {/* ③ 실행 요약 카드 — 실행 전환 중에는 스켈레톤으로 대체한다. */}
          {summaryError && <ErrorAlert description={summaryError} />}
          {summary ? (
            <RunSummaryCard summary={summary} categories={categories} />
          ) : (
            !summaryError && <Skeleton className="h-32 w-full" />
          )}

          {/* ④⑤ 기사 파일 목록 + 본문 미리보기 — 018B의 정적 뼈대를 호출한다(D-011,
              components/results/{article-file-list,article-preview}.tsx). 선택 상태
              (selectedArticleId)와 카테고리 필터(Task 028)는 두 컴포넌트/요약 카드가 공유해야
              하므로 이 페이지가 쥐고 내려준다. */}
          {/* 왼쪽 목록 컬럼은 360px에서 460px로 넓혔다 — 360px에서는 표(파일명·언론사·제목·시각)가
              472px이라 마지막 시각 열이 `overflow-x-auto` 뒤로 통째로 숨어 화면에서 시각을 볼 수
              없었다. 열 폭 고정(`table-fixed`, article-file-list.tsx)과 함께여야 잘림이 사라지고,
              제목 열에도 읽을 만한 폭(약 140px)이 남는다. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[460px_1fr] lg:items-start">
            <ArticleFileList
              runId={selectedRunId}
              selectedArticleId={selectedArticleId}
              onSelectArticleId={handleSelectArticleId}
              categories={categories}
              onCategoriesChange={setCategories}
              query={query}
              onQueryChange={setQuery}
            />
            <ArticlePreview runId={selectedRunId} articleId={selectedArticleId} query={query} />
          </div>
        </div>
      )}
    </PageContainer>
  )
}
