'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

import { CategoryFilter } from '@/components/common/category-filter'
import { ErrorAlert } from '@/components/common/error-alert'
import { HighlightedText } from '@/components/results/highlighted-text'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { fetchRunArticles, type ArticleFileEntry } from '@/lib/api/run-client'
import { formatLocalTimeOnly } from '@/lib/api/run-format'
import type { PressCategory } from '@/lib/types/press'

export interface ArticleFileListProps {
  runId: string
  /** 선택된 기사 id. 아직 아무 것도 고르지 않았으면 null이다. */
  selectedArticleId: string | null
  /** 행 클릭·키보드 선택(Enter/Space) 시 호출된다. */
  onSelectArticleId: (articleId: string) => void
  /** 카테고리 필터(Task 028). 빈 배열이면 전체 — GET .../articles의 category 쿼리와 같은 규칙. */
  categories: PressCategory[]
  onCategoriesChange: (categories: PressCategory[]) => void
  /** 검색 Input의 현재 값(디바운스 전). article-preview.tsx가 제목·본문 하이라이트에도 같은
   * 값을 써야 해서(Task 029) 이 컴포넌트 안에 가두지 않고 page.tsx가 selectedArticleId·
   * categories와 같은 방식으로 쥔다(D-006 패턴). */
  query: string
  onQueryChange: (query: string) => void
}

type LoadState = 'loading' | 'error' | 'ready'

// 검색 입력마다 요청을 쏘지 않기 위한 디바운스 지연(ms). 서버가 검색을 처리하므로
// (ROADMAP Task 018 구현 규칙 — 클라이언트에서 다시 필터링하지 않는다) 타이핑마다 fetch가
// 나가면 값이 늦게 도착한 응답이 최신 응답을 덮어쓸 여지가 생긴다.
const SEARCH_DEBOUNCE_MS = 300

/**
 * ④ 기사 파일 목록(`docs/screens/02-collect-result.md` §영역별 컴포넌트 명세 ④).
 * 검색은 서버가 파일명·제목 대상 대소문자 무시로 처리한다(`fetchRunArticles`,
 * `lib/api/article-search.ts`) — 여기서 다시 필터링하지 않는다.
 */
// runId·검색어 조합이 한 번도 추적되지 않았음을 나타내는 표식(hooks/use-crawl-progress.ts와
// 같은 패턴) — 실제 값(string)과 절대 겹치지 않아야 최초 렌더에서도 "바뀌었다" 분기를 확실히 탄다.
const RUN_UNSET: unique symbol = Symbol('article-file-list-run-unset')
const FETCH_KEY_UNSET: unique symbol = Symbol('article-file-list-fetch-key-unset')

export function ArticleFileList({
  runId,
  selectedArticleId,
  onSelectArticleId,
  categories,
  onCategoriesChange,
  query,
  onQueryChange,
}: ArticleFileListProps) {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<ArticleFileEntry[]>([])
  const [uncategorizedCount, setUncategorizedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [trackedRunId, setTrackedRunId] = useState<string | typeof RUN_UNSET>(RUN_UNSET)
  const [trackedFetchKey, setTrackedFetchKey] = useState<string | typeof FETCH_KEY_UNSET>(
    FETCH_KEY_UNSET
  )

  // 실행(run)을 전환하면 이전 실행에 대한 디바운스된 검색어가 새 실행 화면에 남지 않도록 렌더
  // 도중 즉시 비운다(실제 query 값은 page.tsx가 selectedArticleId·categories와 함께 초기화한다).
  // useEffect 본문에서 무조건 setState를 부르면 react-hooks/set-state-in-effect 경고가 발생해,
  // app/results/page.tsx·hooks/use-crawl-progress.ts와 같은 "prop이 바뀔 때 state를 조정하는"
  // 렌더 중 처리 패턴을 쓴다.
  if (runId !== trackedRunId) {
    setTrackedRunId(runId)
    setDebouncedQuery('')
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  // runId·검색어(디바운스 완료분)·카테고리 필터가 바뀌면(최초 포함) 로딩 상태로 전환한다 —
  // 위와 같은 이유로 렌더 중 처리하고, 실제 fetch와 그 결과 반영은 아래 effect의 비동기
  // 콜백에서만 한다. 카테고리는 순서가 바뀌어도 같은 선택이므로 정렬해 키에 넣는다.
  const categoryKey = [...categories].sort().join(',')
  const fetchKey = `${runId}::${debouncedQuery}::${categoryKey}`
  if (fetchKey !== trackedFetchKey) {
    setTrackedFetchKey(fetchKey)
    setLoadState('loading')
  }

  useEffect(() => {
    let cancelled = false
    fetchRunArticles(runId, debouncedQuery, categories)
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setUncategorizedCount(data.uncategorizedCount)
        setLoadState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '기사 목록을 불러오지 못했습니다')
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categories는 categoryKey로 이미 대변된다.
  }, [runId, debouncedQuery, reloadToken, categoryKey])

  // 버튼 클릭(이벤트 핸들러)에서의 setState는 effect 안이 아니므로 그대로 동기 호출해도 된다.
  const retry = () => {
    setLoadState('loading')
    setReloadToken((token) => token + 1)
  }

  const select = (articleId: string) => onSelectArticleId(articleId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          기사 파일{loadState === 'ready' ? ` (${items.length})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Label htmlFor="article-search" className="sr-only">
            파일명 또는 제목으로 검색
          </Label>
          <Input
            id="article-search"
            placeholder="파일명 · 제목 검색"
            className="pl-8"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        {/* 카테고리 필터(Task 028) — 값이 바뀌면 위 이펙트가 기사 목록을 다시 불러온다. */}
        <div className="space-y-1.5">
          <Label htmlFor="article-category-filter" className="text-xs">
            카테고리
          </Label>
          <CategoryFilter
            id="article-category-filter"
            value={categories}
            onValueChange={onCategoriesChange}
            aria-label="카테고리 필터"
          />
        </div>

        {/* 카테고리 필터로 제외된 "카테고리 미상" 기사 안내(Task 026 팀장 판정) — 필터를
            걸었는데 결과가 0건이어도 "필터가 고장났다"로 읽히지 않도록 이유를 밝힌다. */}
        {categories.length > 0 && uncategorizedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            카테고리 미상 {uncategorizedCount}건은 제외했습니다.
          </p>
        )}

        {loadState === 'error' && (
          <ErrorAlert
            description={error ?? '기사 목록을 불러오지 못했습니다'}
            onRetry={retry}
          />
        )}

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="space-y-2">
            <span className="sr-only">기사 목록 불러오는 중</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {loadState === 'ready' && items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {debouncedQuery ? '검색 결과가 없습니다' : '저장된 기사가 없습니다'}
          </p>
        )}

        {loadState === 'ready' && items.length > 0 && (
          <>
            {/* 데스크톱: 표 형태 (lg 이상).
                ScrollArea에 max-h만 주면 스크롤이 안 된다(Task 029에서 실측 확인) — 내부
                Viewport가 size-full(h-full)인데 부모가 max-height뿐이면 퍼센트 높이가 auto로
                풀려 내용만큼 자라 버린다. flex-1(flex-basis 0%)로 감싸 봐도 Root 자체는
                flex 계산으로 정확한 높이를 받지만, 그 안의 Viewport가 h-full을 실제로
                픽셀값으로 resolve하지 못하는 브라우저 동작을 실측으로 확인했다(2280px 그대로
                노출) — flex의 이 구간은 스펙상으로도 구현별로 갈리는 지점이다. grid의
                `minmax(0,1fr)` 트랙은 이 정의(definite) 전달이 훨씬 안정적이라 grid로
                바꾼다. `min-h-0`이 없으면 grid item의 기본 최소 크기(auto=내용 크기)가
                트랙을 다시 내용만큼 밀어 올린다 — 항목이 적으면 트랙이 내용만큼만 자라 빈
                공간이 남지 않고, 넘치면 이 높이(28rem)에서 스크롤된다. */}
            <div className="hidden max-h-[28rem] grid-rows-[minmax(0,1fr)] lg:grid">
              <ScrollArea className="min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>파일명</TableHead>
                      <TableHead>언론사</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>수집 시각</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((article) => {
                      const isSelected = article.id === selectedArticleId
                      return (
                        <TableRow
                          key={article.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          className={cn('cursor-pointer', isSelected && 'bg-muted')}
                          onClick={() => select(article.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              select(article.id)
                            }
                          }}
                        >
                          <TableCell className="font-mono text-xs">
                            {article.fileName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={article.pressDeleted ? 'outline' : 'secondary'}>
                              {article.pressDeleted ? '삭제된 언론사' : article.pressName}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-48 truncate">
                            <HighlightedText text={article.title} query={query} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatLocalTimeOnly(article.crawledAt)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* 모바일: 카드 리스트 (lg 미만). 스크롤 확정 이유는 위 데스크톱 블록 주석 참고 —
                여기서는 lg 이상에서 숨기는 방향(lg:hidden)으로 표시 조건만 뒤집는다. */}
            <div className="grid max-h-[28rem] grid-rows-[minmax(0,1fr)] lg:hidden">
              <ScrollArea className="min-h-0">
                <ul
                  role="listbox"
                  aria-label="수집된 기사 파일 목록"
                  className="space-y-2"
                >
                  {items.map((article) => {
                    const isSelected = article.id === selectedArticleId
                    return (
                      <li key={article.id} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onClick={() => select(article.id)}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left text-sm',
                            isSelected && 'bg-muted'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {article.fileName}
                            </span>
                            <Badge variant={article.pressDeleted ? 'outline' : 'secondary'}>
                              {article.pressDeleted ? '삭제된 언론사' : article.pressName}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate font-medium">
                            <HighlightedText text={article.title} query={query} />
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatLocalTimeOnly(article.crawledAt)}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
