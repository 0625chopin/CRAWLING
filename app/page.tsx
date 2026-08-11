'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useCrawlTabField } from '@/components/app-state-provider'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CrawlRunPanel } from '@/components/crawl/crawl-run-panel'
import { PressSelectCard, type PressListLoadState } from '@/components/crawl/press-select-card'
import { fetchActivePressList, startCrawl } from '@/lib/api/crawl-client'
import type { PressSourceWithUrl } from '@/lib/api/press-client'
import type { PressCategory } from '@/lib/types/press'

const EMPTY_PRESS_LIST: PressSourceWithUrl[] = []

export default function CrawlRunPage() {
  // 탭을 옮겼다 돌아와도 언론사 선택·최대 기사 수·목록 스냅샷·실행 중인 runId가 그대로
  // 남아 있어야 한다(Task 031) — app/layout.tsx의 AppStateProvider가 들고 있는 상태를 그대로
  // 쓴다. 이 페이지 안에는 렌더 도중 값이 바뀌었다고 되돌리는 로직이 없어(그런 로직이 있는
  // /results·/keywords와 달리) 모든 필드를 컨텍스트에 직접 바인딩해도 안전하다.
  const [pressListSnapshot, setPressList] = useCrawlTabField('pressList')
  const [selectedIds, setSelectedIds] = useCrawlTabField('selectedIds')
  const [maxArticlesPerPress, setMaxArticlesPerPress] = useCrawlTabField('maxArticlesPerPress')
  const [runId, setRunId] = useCrawlTabField('runId')

  const pressList = pressListSnapshot ?? EMPTY_PRESS_LIST
  // 이전 방문에서 받아온 스냅샷이 있으면 스켈레톤 없이 그대로 그리고 뒤에서 조용히 재조회한다
  // (stale-while-revalidate, Task 031). 로딩 플래그 자체는 일시적 UI 상태라 페이지 로컬로 둔다.
  const [loadState, setLoadState] = useState<PressListLoadState>(() =>
    pressListSnapshot !== null ? 'ready' : 'loading'
  )
  // "다시 시도" 버튼이 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다(app/press/page.tsx와 같은 패턴).
  const [reloadToken, setReloadToken] = useState(0)

  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    fetchActivePressList()
      .then((data) => {
        setPressList(data)
        setLoadState('ready')
      })
      .catch(() => {
        // 캐시된 목록이 있으면 화면은 그대로 두고 실패를 조용히 흘린다 — 재조회 실패로 방금까지
        // 보이던 좋은 데이터를 지우지 않는다(Task 031 stale-while-revalidate).
        setLoadState((prev) => (prev === 'ready' ? 'ready' : 'error'))
      })
  }, [reloadToken, setPressList])

  const retry = useCallback(() => {
    setLoadState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  const handleToggleOne = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [setSelectedIds]
  )

  const handleToggleAll = useCallback(
    (nextChecked: boolean) => {
      setSelectedIds(nextChecked ? new Set(pressList.map((press) => press.id)) : new Set())
    },
    [pressList, setSelectedIds]
  )

  /** 카테고리 헤더의 전체 선택/해제(Task 028) — 그 카테고리에 속한 언론사만 선택 Set에 더하거나 뺀다. */
  const handleToggleCategory = useCallback(
    (category: PressCategory, nextChecked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const press of pressList) {
          if (press.category !== category) continue
          if (nextChecked) next.add(press.id)
          else next.delete(press.id)
        }
        return next
      })
    },
    [pressList, setSelectedIds]
  )

  // 진행 패널이 pressId만 갖고 있는 pressStatuses에서 카테고리를 보여줄 수 있도록 만든 조회용
  // 맵이다(Task 028 — "어느 카테고리를 수집 중인지 진행 패널에도 드러낸다"). RunProgress·CrawlRun
  // 스키마(크롤 파이프라인 소유)에는 카테고리가 없으므로 화면이 이미 들고 있는 pressList에서
  // 클라이언트 쪽으로 join한다 — 저장소·크롤 파이프라인 타입을 건드리지 않는다.
  const categoryByPressId = useMemo(() => {
    const map = new Map<string, PressCategory>()
    for (const press of pressList) map.set(press.id, press.category)
    return map
  }, [pressList])

  const isRunning = runId !== null
  const isPressEmpty = loadState === 'ready' && pressList.length === 0

  /**
   * [새로 크롤링하기](설계서 §④·§⑧). runId를 비워 진행 패널을 다시 ①(기본) 상태로 되돌리고,
   * 선택 상태도 초기화한다 — 방금 끝난 실행의 언론사 선택이 다음 실행에 남아 있지 않게 한다.
   */
  const handleReset = useCallback(() => {
    setRunId(null)
    setSelectedIds(new Set())
  }, [setRunId, setSelectedIds])

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
          onToggleCategory={handleToggleCategory}
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
          categoryByPressId={categoryByPressId}
        />
      </div>
    </PageContainer>
  )
}
