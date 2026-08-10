'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CrawlRunPanel } from '@/components/crawl/crawl-run-panel'
import { PressSelectCard, type PressListLoadState } from '@/components/crawl/press-select-card'
import { fetchActivePressList, startCrawl } from '@/lib/api/crawl-client'
import type { PressSourceWithUrl } from '@/lib/api/press-client'

/** 화면 설계서 01 §크롤링 옵션 노출 범위 결정 — 서버 기본값과 동일하게 맞춘 안내용 초깃값. */
const DEFAULT_MAX_ARTICLES = '20'

export default function CrawlRunPage() {
  const [loadState, setLoadState] = useState<PressListLoadState>('loading')
  const [pressList, setPressList] = useState<PressSourceWithUrl[]>([])
  // "다시 시도" 버튼이 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다(app/press/page.tsx와 같은 패턴).
  const [reloadToken, setReloadToken] = useState(0)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [maxArticlesPerPress, setMaxArticlesPerPress] = useState(DEFAULT_MAX_ARTICLES)

  // runId가 있으면 실행 중이다. 선택 상태는 좌측 press-select-card와 공유해야 하므로 이
  // 페이지가 쥐고 있고, crawl-run-panel.tsx(우측 패널)에는 필요한 값만 props로 내려준다.
  // 진행률·언론사별 상태·완료/부분 실패/중단 화면은 그 컴포넌트 내부의 TODO 자리를 016B가
  // 채운다(docs/DECISIONS.md D-011·D-006) — 이 페이지를 다시 고치지 않는다.
  const [runId, setRunId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    fetchActivePressList()
      .then((data) => {
        setPressList(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }, [reloadToken])

  const retry = useCallback(() => {
    setLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  const handleToggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(
    (nextChecked: boolean) => {
      setSelectedIds(nextChecked ? new Set(pressList.map((press) => press.id)) : new Set())
    },
    [pressList]
  )

  const isRunning = runId !== null
  const isPressEmpty = loadState === 'ready' && pressList.length === 0

  /**
   * [새로 크롤링하기](설계서 §④·§⑧). runId를 비워 진행 패널을 다시 ①(기본) 상태로 되돌리고,
   * 선택 상태도 초기화한다 — 방금 끝난 실행의 언론사 선택이 다음 실행에 남아 있지 않게 한다.
   */
  const handleReset = useCallback(() => {
    setRunId(null)
    setSelectedIds(new Set())
  }, [])

  async function handleStart() {
    setIsStarting(true)
    try {
      const parsedMax = Number.parseInt(maxArticlesPerPress, 10)
      const { runId: startedRunId } = await startCrawl({
        pressIds: Array.from(selectedIds),
        maxArticlesPerPress: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : undefined,
      })
      setRunId(startedRunId)
    } catch (error) {
      // fail()이 만든 메시지는 이미 한국어라 그대로 노출해도 된다(docs/CONVENTIONS.md §6).
      toast.error(error instanceof Error ? error.message : '크롤링 시작에 실패했습니다')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    // PageContainer가 <main className="flex-1">과 container 클래스를 모두 제공한다.
    <PageContainer>
      {/* 홈은 브레드크럼이 1단이다(00-app-shell.md §브레드크럼 규격). */}
      <PageHeader
        breadcrumbs={[{ label: '크롤링 실행' }]}
        title="크롤링 실행"
        description="언론사를 선택하고 크롤링을 시작하세요"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* ② 언론사 선택 */}
        <PressSelectCard
          loadState={loadState}
          pressList={pressList}
          selectedIds={selectedIds}
          onToggleOne={handleToggleOne}
          onToggleAll={handleToggleAll}
          onRetry={retry}
          disabled={isRunning || isStarting}
        />

        {/* ③④ 크롤링 옵션 & 실행 — 정적 뼈대 분할은 crawl-run-panel.tsx 내부(D-011)를 따른다. */}
        <CrawlRunPanel
          runId={runId}
          isRunning={isRunning}
          isStarting={isStarting}
          isPressEmpty={isPressEmpty}
          selectedCount={selectedIds.size}
          maxArticlesPerPress={maxArticlesPerPress}
          onMaxArticlesPerPressChange={setMaxArticlesPerPress}
          onStart={handleStart}
          onReset={handleReset}
        />
      </div>
    </PageContainer>
  )
}
