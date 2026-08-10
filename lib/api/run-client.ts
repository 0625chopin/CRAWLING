import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { CrawlRunStatus } from '@/lib/types/crawl-run'
import type { ContentSource } from '@/lib/types/article'

/**
 * GET /api/runs 응답 항목(app/api/runs/route.ts). `label`은 서버가 이미 조립해 내려준다
 * (`buildRunListLabel`, Task 017 구현 규칙 "셀렉터 라벨은 서버에서 조립해 내려준다") — 이 화면은
 * 그 문자열을 그대로 쓰고 클라이언트에서 다시 만들지 않는다.
 */
export interface RunListItem {
  id: string
  label: string
  startedAt: string
  finishedAt: string | null
  status: CrawlRunStatus
  targetPressCount: number
  successCount: number
  failCount: number
  /** 중단으로 요청조차 하지 않은 기사 수(I-017). failCount와 합치지 않는다(D-029). */
  skippedCount: number
}

/**
 * 실행 대상 언론사 1건. 삭제된 언론사는 과거 이름을 스냅샷하지 않고 `name: null, deleted: true`로
 * 온다(D-026) — 화면은 고정 문구 "삭제된 언론사"로 그린다(D-027).
 */
export interface RunTargetPress {
  id: string
  name: string | null
  deleted: boolean
}

/** GET /api/runs/{runId} 응답(app/api/runs/[runId]/route.ts). */
export interface RunSummary {
  id: string
  startedAt: string
  finishedAt: string | null
  /** finishedAt이 없거나 시각이 역전된 손상 데이터면 null(run-format.ts의 formatDurationLabel). */
  durationLabel: string | null
  status: CrawlRunStatus
  targetPress: RunTargetPress[]
  successCount: number
  failCount: number
  skippedCount: number
  /** Windows에서도 슬래시로 정규화된 프로젝트 루트 상대경로다. */
  storagePath: string
}

/**
 * GET /api/runs/{runId}/articles 응답 항목 1건(app/api/runs/[runId]/articles/route.ts, 본문 미포함).
 * 018B(`article-file-list.tsx`)가 쓴다.
 */
export interface ArticleFileEntry {
  id: string
  fileName: string
  pressId: string
  pressName: string | null
  pressDeleted: boolean
  title: string
  contentSource: ContentSource
  crawledAt: string
}

/**
 * GET /api/runs/{runId}/articles/{articleId} 응답(본문 포함). 018B(`article-preview.tsx`)가 쓴다.
 */
export interface ArticleFileDetail {
  id: string
  runId: string
  pressId: string
  pressName: string | null
  pressDeleted: boolean
  title: string
  url: string
  content: string
  contentSource: ContentSource
  crawledAt: string
}

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new Error(body.message)
  }
  return body.data
}

/** 실행 목록(최신순, F004). run-select.tsx가 쓴다. */
export async function fetchRuns(): Promise<RunListItem[]> {
  const response = await fetch('/api/runs')
  return unwrap<RunListItem[]>(response)
}

/** 실행 요약 단건. run-summary-card.tsx가 쓴다. */
export async function fetchRunSummary(runId: string): Promise<RunSummary> {
  const response = await fetch(`/api/runs/${runId}`)
  return unwrap<RunSummary>(response)
}

/**
 * 기사 파일 목록(검색어 선택). 018A는 이 함수를 호출하지 않는다 — article-file-list.tsx 내부를
 * 채우는 018B가 쓴다. run-client.ts가 이 화면의 단일 API 클라이언트라 미리 갖춰 둔다
 * (lib/api/crawl-client.ts가 abortCrawl을 016B 몫으로 미리 준비해 둔 것과 같은 이유).
 */
export async function fetchRunArticles(
  runId: string,
  query?: string
): Promise<{ items: ArticleFileEntry[]; total: number }> {
  const params = query ? `?q=${encodeURIComponent(query)}` : ''
  const response = await fetch(`/api/runs/${runId}/articles${params}`)
  return unwrap<{ items: ArticleFileEntry[]; total: number }>(response)
}

/** 기사 본문 단건. 018B(article-preview.tsx)가 쓴다. */
export async function fetchArticleDetail(
  runId: string,
  articleId: string
): Promise<ArticleFileDetail> {
  const response = await fetch(`/api/runs/${runId}/articles/${articleId}`)
  return unwrap<ArticleFileDetail>(response)
}
