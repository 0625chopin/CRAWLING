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
import { formatLocalTimeOnly, formatPublishedTimeLabel } from '@/lib/api/run-format'
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
 * 「발행 09:58 / 수집 10:26」 두 줄을 함께 그린다. 두 시각을 각각 열로 두면 표가 왼쪽 컬럼
 * (360px)을 넘어 가로 스크롤 뒤로 숨는데, 실제로 그 상태였다 — 표가 472px이라 「수집 시각」 열
 * 71px이 통째로 잘려 화면에서 시각을 아예 볼 수 없었다. 한 셀에 쌓으면 열을 늘리지 않고 정보만
 * 하나 더 얹을 수 있다.
 *
 * 발행 시각이 없는 기사는 「미상」이다 — 수집 시각을 대신 보여주면 둘을 구분할 수 없게 된다
 * (`lib/types/article.ts`의 publishedAt 주석과 같은 원칙).
 */
function ArticleTimeLines({ article }: { article: ArticleFileEntry }) {
  const published = formatPublishedTimeLabel(article.publishedAt, article.crawledAt)

  return (
    <div className="text-xs leading-tight text-muted-foreground">
      <div className={published === null ? undefined : 'text-foreground'}>
        발행 {published ?? '미상'}
      </div>
      <div>수집 {formatLocalTimeOnly(article.crawledAt)}</div>
    </div>
  )
}

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
                **목록에 자체 스크롤을 두지 않는다.** 22일차에 고정 높이 + 내부 ScrollArea로
                만들었다가 실사용에서 더 나쁜 함정이 드러났다(I-059): 이 카드는 실행 선택·요약
                카드 아래에 놓여 화면 최상단에서 677px 지점에서 시작하는데, 창 높이가 900px이면
                목록 스크롤 영역이 61px만 보인다. 그 상태에서 휠을 굴리면 **페이지가 아니라 안쪽
                목록이 먼저 스크롤된다** — 기사 500건이면 안쪽 콘텐츠가 19,000px이라 그걸 다 지나야
                페이지가 움직인다. 사용자 입장에서는 "스크롤이 안 내려가서 아래 파일을 클릭할 수
                없다"가 된다. 중첩 스크롤 컨테이너를 없애 페이지 스크롤 하나만 남기는 것이
                유일하게 안정적인 해법이다. 오른쪽 미리보기는 `lg:sticky`로 따라오므로 목록이
                길어져도 계속 보인다. */}
            <div className="hidden lg:block">
              <div>
                {/* `table-fixed` + 열 폭 고정 — 자동 폭에 맡기면 제목·언론사가 내용만큼 늘어나
                    표가 카드(360px)를 넘고, 넘친 부분은 `Table`이 감싸는 `overflow-x-auto`
                    컨테이너 뒤로 숨는다. 실제로 표가 472px이라 마지막 시각 열이 통째로 가려져
                    있었다 — 세로 중첩 스크롤을 걷어낸 I-059와 같은 함정이 가로로 재현된 것이다. */}
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      {/* `0001.txt`는 mono text-xs로 약 58px이다 — w-16(64px, 안쪽 여백 16px 제외
                          48px)이면 글자가 잘리고, 잘린 폭이 컨테이너 scrollWidth에 남아 10px짜리
                          가로 스크롤바가 생긴다. 잘리지 않는 폭을 준다. */}
                      <TableHead className="w-20">파일명</TableHead>
                      <TableHead className="w-24">언론사</TableHead>
                      <TableHead>제목</TableHead>
                      {/* 가장 긴 값은 날짜가 붙는 「발행 08-10 19:38」(약 85px + 안쪽 여백 16px)이다
                          — w-24(96px)면 그 행만 넘쳐 표 전체에 가로 스크롤바가 생긴다. */}
                      <TableHead className="w-28">시각</TableHead>
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
                          {/* 잘라내기는 `td`가 아니라 안쪽 블록에 건다 — `td`에 직접 걸면 눈에는
                              잘려 보여도 넘친 폭이 컨테이너의 scrollWidth에 그대로 남아 가로
                              스크롤바가 생긴다(실측 11px). */}
                          <TableCell className="font-mono text-xs">
                            <div className="truncate">{article.fileName}</div>
                          </TableCell>
                          <TableCell>
                            {/* Badge는 이미 overflow-hidden이라 max-w-full만 주면 잘린다.
                                고정 폭 열 안에서 언론사명이 길어도 옆 열을 밀지 않는다. */}
                            <Badge
                              variant={article.pressDeleted ? 'outline' : 'secondary'}
                              className="max-w-full"
                            >
                              {article.pressDeleted ? '삭제된 언론사' : article.pressName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="truncate">
                              <HighlightedText text={article.title} query={query} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <ArticleTimeLines article={article} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 모바일: 카드 리스트 (lg 미만). 자체 스크롤을 두지 않는 이유는 위 데스크톱 블록
                주석 참고(I-059) — 모바일은 화면이 더 좁아 목록이 화면 밖에서 시작할 여지가 크므로
                같은 함정이 더 쉽게 재현된다. */}
            <div className="lg:hidden">
              <div>
                <ul
                  role="listbox"
                  aria-label="수집된 기사 파일 목록"
                  className="space-y-2"
                >
                  {items.map((article) => {
                    const isSelected = article.id === selectedArticleId
                    // 모바일은 한 줄에 나란히 놓을 수 있어 표(두 줄 쌓기)와 배치가 다르다.
                    const publishedLabel = formatPublishedTimeLabel(
                      article.publishedAt,
                      article.crawledAt
                    )
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
                          <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                            <span className={publishedLabel === null ? undefined : 'text-foreground'}>
                              발행 {publishedLabel ?? '미상'}
                            </span>
                            <span>수집 {formatLocalTimeOnly(article.crawledAt)}</span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
