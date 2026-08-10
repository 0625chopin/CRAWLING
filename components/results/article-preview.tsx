'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorAlert } from '@/components/common/error-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchArticleDetail, type ArticleFileDetail } from '@/lib/api/run-client'
import { formatLocalDateTimeSecond, formatLocalTime } from '@/lib/api/run-format'

export interface ArticlePreviewProps {
  runId: string | null
  articleId: string | null
}

type LoadState = 'idle' | 'loading' | 'error' | 'ready'

// 본문 출처 배지 문구 — 값과 라벨의 대응을 여기 한 곳에만 둔다(설계서 02 스켈레톤과 동일한 의도).
// 'rss-summary'는 피드 요약(수백 자), 'article-page'는 원문 전문(수천 자)이라 본문 길이가 왜
// 다른지를 이 배지가 설명한다(PRD §Article).
const CONTENT_SOURCE_LABEL: Record<ArticleFileDetail['contentSource'], string> = {
  'rss-summary': '피드 요약',
  'article-page': '원문 전문',
}

/**
 * ⑤ 본문 미리보기(`docs/screens/02-collect-result.md` §영역별 컴포넌트 명세 ⑤).
 * `articleId`가 없으면 상태별 화면 ③(파일 미선택)을 그린다. 수집 시각은 D-025대로 반응형별로
 * 갈리는 포맷을 서버가 굽지 않고 화면이 ISO를 받아 직접 고른다 — 데스크톱은 날짜까지 포함한
 * `formatLocalDateTimeSecond`, 모바일은 시:분:초만 남기는 `formatLocalTime`(I-025로 추가됨,
 * `run-summary-card.tsx`의 `hidden sm:inline`/`sm:hidden` 두 벌 렌더와 같은 방식).
 */
// runId·articleId 조합이 한 번도 추적되지 않았음을 나타내는 표식(hooks/use-crawl-progress.ts와
// 같은 패턴).
const SELECTION_UNSET: unique symbol = Symbol('article-preview-selection-unset')

export function ArticlePreview({ runId, articleId }: ArticlePreviewProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [article, setArticle] = useState<ArticleFileDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [trackedSelectionKey, setTrackedSelectionKey] = useState<
    string | typeof SELECTION_UNSET
  >(SELECTION_UNSET)

  // 선택된 기사가 바뀌면(파일 미선택 ↔ 선택 포함) 이전 기사의 본문·오류가 남지 않도록 렌더
  // 도중 즉시 상태를 조정한다. useEffect 본문에서 무조건 setState를 부르면
  // react-hooks/set-state-in-effect 경고가 발생해, app/results/page.tsx와 같은 렌더 중 처리
  // 패턴을 쓴다. 실제 fetch와 결과 반영은 아래 effect의 비동기 콜백에서만 한다.
  const selectionKey = `${runId ?? ''}::${articleId ?? ''}`
  if (selectionKey !== trackedSelectionKey) {
    setTrackedSelectionKey(selectionKey)
    if (!runId || !articleId) {
      setLoadState('idle')
      setArticle(null)
    } else {
      setLoadState('loading')
    }
  }

  useEffect(() => {
    if (!runId || !articleId) return

    let cancelled = false
    fetchArticleDetail(runId, articleId)
      .then((data) => {
        if (cancelled) return
        setArticle(data)
        setLoadState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '기사 본문을 불러오지 못했습니다')
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [runId, articleId, reloadToken])

  // 버튼 클릭(이벤트 핸들러)에서의 setState는 effect 안이 아니므로 그대로 동기 호출해도 된다.
  const retry = () => {
    setLoadState('loading')
    setReloadToken((token) => token + 1)
  }

  if (loadState === 'idle') {
    // Empty 프리미티브가 flex-1로 부모를 채우므로, 목록(h-[28rem])과 높이를 맞추기 위해
    // 바깥 래퍼에서 높이를 준다(설계서 §상태별 화면 ③).
    return (
      <div className="flex h-[28rem]">
        <EmptyState
          icon={<FileText />}
          title="파일을 선택하면 본문을 미리 볼 수 있습니다"
          description="왼쪽 기사 파일 목록에서 확인할 기사를 고르세요"
        />
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-2/3" />
        </CardHeader>
        <CardContent
          role="status"
          aria-live="polite"
          className="space-y-3"
        >
          <span className="sr-only">본문 불러오는 중</span>
          <Skeleton className="h-4 w-1/3" />
          <Separator />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <ErrorAlert
        description={error ?? '기사 본문을 불러오지 못했습니다'}
        onRetry={retry}
      />
    )
  }

  if (!article) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base leading-snug font-medium">{article.title}</CardTitle>
        <CardAction>
          {/* 언론사 원문(외부 도메인)이므로 raw <a>가 맞다 — next/link로 바꾸지 않는다. */}
          <Button variant="ghost" size="icon" asChild>
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              <span className="sr-only">새 창에서 원문 기사 열기</span>
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={article.pressDeleted ? 'outline' : 'secondary'}>
            {article.pressDeleted ? '삭제된 언론사' : article.pressName}
          </Badge>
          <Badge variant="secondary">{CONTENT_SOURCE_LABEL[article.contentSource]}</Badge>
          <span>
            <span className="hidden sm:inline">
              {formatLocalDateTimeSecond(article.crawledAt)}
            </span>
            <span className="sm:hidden">{formatLocalTime(article.crawledAt)}</span>
            {' 수집'}
          </span>
        </div>
        <Separator className="my-3" />
        {/* 선택이 바뀔 때마다 내용이 갱신되므로 스크린리더에 변경 사실을 알린다.
            whitespace-pre-wrap이 의미를 가지려면 본문에 개행이 남아 있어야 한다 —
            article-parser.ts가 문단 개행을 보존해 저장한다(설계서 "본문 개행 보존 전제"). */}
        <ScrollArea className="h-[28rem]">
          <div
            aria-live="polite"
            className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
          >
            {article.content}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
