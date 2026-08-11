'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Ban, RefreshCw, Search, SearchX } from 'lucide-react'

import { useStopwordsTabField } from '@/components/app-state-provider'
import { ErrorAlert } from '@/components/common/error-alert'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { StopwordAddCard } from '@/components/stopwords/stopword-add-card'
import { StopwordSection } from '@/components/stopwords/stopword-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStopwords } from '@/lib/api/stopword-client'
import type { Stopword } from '@/lib/types/stopword'

type LoadState = 'loading' | 'error' | 'ready'

const EMPTY_STOPWORDS: Stopword[] = []

export default function StopwordsPage() {
  // 탭을 옮겼다 돌아와도 목록 스냅샷·검색어가 그대로 남아 있어야 한다(Task 031). 이 페이지에는
  // 렌더 도중 값을 되돌리는 로직이 없어 컨텍스트에 직접 바인딩해도 안전하다(app/page.tsx와 같은 근거).
  const [stopwordsSnapshot, setStopwords] = useStopwordsTabField('stopwords')
  const [searchQuery, setSearchQuery] = useStopwordsTabField('query')
  const stopwords = stopwordsSnapshot ?? EMPTY_STOPWORDS
  // 이전 방문의 스냅샷이 있으면 스켈레톤 없이 그대로 그리고 뒤에서 재조회한다(stale-while-revalidate).
  const [state, setState] = useState<LoadState>(() =>
    stopwordsSnapshot !== null ? 'ready' : 'loading'
  )
  // 재조회 트리거 — "다시 시도" 버튼은 이 값을 바꿔 아래 이펙트를 다시 돌리는 방식으로 재조회한다.
  const [reloadToken, setReloadToken] = useState(0)
  // 삭제 결과를 알리는 라이브 리전. 칩 삭제는 두 섹션에 걸쳐 있어 상태를 이 페이지가 들고 있는다.
  const [liveMessage, setLiveMessage] = useState('')

  useEffect(() => {
    fetchStopwords()
      .then((data) => {
        setStopwords(data)
        setState('ready')
      })
      .catch(() => {
        // 캐시된 목록이 있으면 화면은 그대로 두고 실패를 조용히 흘린다(Task 031 stale-while-revalidate).
        setState((prev) => (prev === 'ready' ? 'ready' : 'error'))
      })
  }, [reloadToken, setStopwords])

  const retry = useCallback(() => {
    setState('loading')
    setReloadToken((token) => token + 1)
  }, [])

  const handleDeleted = useCallback(
    (deleted: Stopword) => {
      setStopwords((prev) => (prev ?? []).filter((item) => item.id !== deleted.id))
      setLiveMessage(`'${deleted.word}' 불용어가 삭제되었습니다`)
    },
    [setStopwords]
  )

  const handleAdded = useCallback(
    (added: Stopword[]) => {
      setStopwords((prev) => [...(prev ?? []), ...added])
    },
    [setStopwords]
  )

  const defaultStopwords = stopwords.filter((item) => item.isDefault)
  const customStopwords = stopwords.filter((item) => !item.isDefault)

  // 검색은 두 섹션에 동시에 적용하고, 결과가 없어도 섹션 구조(제목 + 개수)는 유지한다
  // (docs/screens/05-stopword-manage.md §설계 결정 요약). 헤딩 개수는 필터된 결과가 아니라
  // 원본 총 개수를 그대로 쓴다 — StopwordSection의 totalCount로 넘긴다.
  const query = searchQuery.trim()
  const visibleDefaultStopwords = query
    ? defaultStopwords.filter((item) => item.word.includes(query))
    : defaultStopwords
  const visibleCustomStopwords = query
    ? customStopwords.filter((item) => item.word.includes(query))
    : customStopwords

  return (
    // width="narrow"가 이 화면의 max-w-3xl 예외다(설계서 §설계 결정 요약).
    <PageContainer width="narrow">
      <PageHeader
        breadcrumbs={[{ label: '홈', href: '/' }, { label: '불용어 관리' }]}
        title="불용어 관리"
        description='핫 키워드 집계에서 제외할 단어를 관리합니다. "기자", "사진"처럼 기사에 반복적으로 등장하는 상투어를 걸러 랭킹의 신뢰도를 높입니다.'
        action={
          <Button asChild className="shrink-0">
            <Link href="/keywords">
              <RefreshCw className="size-4" aria-hidden="true" />
              {/* 375px에서 제목과 한 줄에 들어가도록 모바일에서는 라벨을 줄인다 */}
              <span className="hidden sm:inline">분석 페이지로 돌아가&nbsp;</span>재분석
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {state === 'loading' ? (
          // 설계서 05 §상태별 화면 ⑦ — 최초 목록 조회 중에는 "불용어 추가" 카드·검색 입력·
          // 두 섹션을 전부 skeleton으로 대체한다. 로딩 중에도 실물 입력(StopwordAddCard)이
          // 그대로 보이면 목록이 아직 없는 상태에서 사용자가 조작할 수 있게 되므로, 조회가
          // 끝나기 전에는 아무것도 동작하지 않는 화면만 보여준다(5일차 교차검증 지적 반영).
          <div role="status" aria-live="polite" className="space-y-6">
            <span className="sr-only">불용어 목록을 불러오는 중입니다</span>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>

            <Skeleton className="h-8 w-full" />

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">기본 제공 불용어</h2>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">사용자 추가 불용어</h2>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 내부 추가·일괄 추가 로직은 이 회차(012B)가 채웠다(D-006) */}
            <StopwordAddCard onAdded={handleAdded} />

            <div className="space-y-1.5">
              <Label htmlFor="stopword-search" className="sr-only">
                불용어 검색
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="stopword-search"
                  placeholder="불용어 검색"
                  className="pl-8"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            {state === 'error' && (
              <ErrorAlert description="불용어 목록을 불러오지 못했습니다" onRetry={retry} />
            )}

            {state === 'ready' && (
              <>
                <StopwordSection
                  headingId="default-stopword-heading"
                  title="기본 제공 불용어"
                  description="자동으로 제외되는 상투어입니다. 삭제하면 확인 절차를 거칩니다."
                  items={visibleDefaultStopwords}
                  totalCount={defaultStopwords.length}
                  emptyState={
                    query
                      ? {
                          icon: <SearchX />,
                          title: `'${query}'과 일치하는 기본 제공 불용어가 없습니다`,
                          description: '검색어를 지우면 전체 목록으로 돌아갑니다',
                        }
                      : undefined
                  }
                  onDeleted={handleDeleted}
                />
                <StopwordSection
                  headingId="custom-stopword-heading"
                  title="사용자 추가 불용어"
                  items={visibleCustomStopwords}
                  totalCount={customStopwords.length}
                  emptyState={
                    query
                      ? {
                          icon: <SearchX />,
                          title: `'${query}'과 일치하는 사용자 추가 불용어가 없습니다`,
                          description: '검색어를 지우면 전체 목록으로 돌아갑니다',
                        }
                      : {
                          icon: <Ban />,
                          title: '아직 추가한 불용어가 없습니다',
                          description: '위 입력창에서 새 불용어를 추가해 보세요',
                        }
                  }
                  onDeleted={handleDeleted}
                />
              </>
            )}
          </>
        )}

        {/* 삭제 결과 라이브 리전 — 두 섹션에 걸친 상태라 페이지가 직접 들고 있는다 */}
        <div role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </PageContainer>
  )
}
