'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'

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

// selectedRunId가 한 번도 추적되지 않았음을 나타내는 표식(hooks/use-crawl-progress.ts와 같은
// 패턴). 최초 렌더에서도 "바뀌었다" 분기를 확실히 태워, 이전 실행의 요약이 새로 고른 실행 화면에
// 잠깐이라도 남지 않게 한다.
const UNSET: unique symbol = Symbol('results-run-unset')

export default function CollectResultPage() {
  const [runsLoadState, setRunsLoadState] = useState<RunsLoadState>('loading')
  const [runs, setRuns] = useState<RunListItem[]>([])
  // "다시 시도" 버튼이 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다
  // (app/press/page.tsx·app/page.tsx와 같은 패턴).
  const [reloadToken, setReloadToken] = useState(0)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [trackedRunId, setTrackedRunId] = useState<string | null | typeof UNSET>(UNSET)
  // 선택된 기사 id. article-file-list.tsx·article-preview.tsx(018B)가 공유해야 하는 형제 간
  // 상태라 이 페이지가 쥔다(016A의 selectedIds·runId와 같은 이유) — 018B는 컴포넌트 내부만
  // 채우면 되고 이 파일을 다시 열 필요가 없다(D-006, 11일차 교차검증 반영).
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const handleSelectArticleId = useCallback((articleId: string) => {
    setSelectedArticleId(articleId)
  }, [])
  // 카테고리 필터(Task 028). article-file-list.tsx와 run-summary-card.tsx가 공유해야 하는
  // 값이라(목록을 좁히는 동시에 요약 카드에 "지금 보는 범위"를 보여준다) 이 페이지가 쥔다 —
  // selectedArticleId와 같은 이유(D-006 패턴).
  const [categories, setCategories] = useState<PressCategory[]>([])
  // 기사 검색 Input의 값(Task 029). article-file-list.tsx(검색 대상·디바운스 fetch)와
  // article-preview.tsx(제목·본문 하이라이트)가 같은 값을 봐야 화면 두 곳의 강조가 어긋나지
  // 않는다 — categories·selectedArticleId와 같은 이유로 이 페이지가 쥔다(D-006 패턴).
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data)
        setRunsLoadState('ready')
        // 최초 로드에서만 최신 실행(목록 첫 항목, listRuns가 이미 내림차순 정렬)을 기본 선택한다.
        setSelectedRunId((prev) => prev ?? (data[0]?.id ?? null))
      })
      .catch(() => setRunsLoadState('error'))
  }, [reloadToken])

  const retry = useCallback(() => {
    setRunsLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  // selectedRunId가 바뀌면(최초 선택 포함) 이전 실행의 요약·오류가 남지 않도록 렌더 도중 즉시
  // 초기화한다. useEffect 본문에서 무조건 setState를 부르면 커밋마다 렌더가 한 번 더 발생한다는
  // 린트 경고(react-hooks/set-state-in-effect)가 있어, "prop이 바뀔 때 state를 조정하는" 렌더 중
  // 처리 패턴을 쓴다(hooks/use-crawl-progress.ts와 동일한 근거).
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
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
