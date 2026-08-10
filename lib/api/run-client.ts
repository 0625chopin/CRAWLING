import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { CrawlRunStatus } from '@/lib/types/crawl-run'
import type { ContentSource } from '@/lib/types/article'
import type { PressCategory } from '@/lib/types/press'

/**
 * GET /api/runs 응답 항목(app/api/runs/route.ts). `label`은 서버가 이미 조립해 내려준다
 * (`buildRunListLabel`, Task 017 구현 규칙 "셀렉터 라벨은 서버에서 조립해 내려준다") — 이 화면은
 * 그 문자열을 그대로 쓰고 클라이언트에서 다시 만들지 않는다.
 *
 * **`targetCategories`는 여기(목록)에는 없고 `RunSummary`(단건)에만 있다(21일차 판단).** 이미
 * `targetPress`(대상 언론사 전체 목록)도 목록에는 없고 단건에만 있는 선례가 있고, 이 셀렉터의
 * 유일한 소비처(`run-select.tsx`·`analysis-filter-bar.tsx`의 `<Select>`)는 `label` 문자열 하나만
 * 렌더링해 카테고리 배지를 보여줄 자리가 없다. 지금 쓰는 곳이 없는 필드를 미리 얹으면 죽은
 * 필드가 된다 — 셀렉터에 카테고리 배지가 필요해지면(예: 드롭다운에서 카테고리로 run을 한눈에
 * 구분) 그때 이 인터페이스와 `buildRunListLabel`을 함께 확장한다.
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
  /**
   * 실행 시작 당시 카테고리로 대상을 골랐다면 그 스냅샷(크롤 파이프라인 Task 027,
   * `CrawlRun.targetCategories`을 그대로 통과시킨 값)이다.
   *
   * **빈 배열은 "전체 카테고리"라는 뜻이 아니다.** ①언론사를 카테고리가 아니라 개별 체크박스로
   * 직접 골랐거나, ②이 필드가 생기기 전(Task 027 이전)에 만들어진 과거 run — 두 경우를 이 응답
   * 만으로는 구분할 수 없고, 구분할 필요도 없다: 어느 쪽이든 "이 run에 붙은 카테고리 스냅샷이
   * 없다"는 같은 사실이다. 화면은 이 배열이 비었을 때 "대상 카테고리: 전체"처럼 채워 넣지 말고
   * (그 자체가 지어낸 사실이다 — 21일차 「대상 카테고리」 라벨이 필터 상태를 대상인 것처럼
   * 보여준 것과 같은 종류의 오류), 행을 감추거나 "카테고리 미지정" 같은 중립 문구로 다뤄야 한다.
   */
  targetCategories: PressCategory[]
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
  /**
   * 크롤 시점 카테고리 스냅샷(Task 026). 값의 실제 원천은 크롤 파이프라인(Task 027)이라 지금
   * 저장된 기사는 전부 `null`이다 — "카테고리 미상"이지 "IT/AI"가 아니다.
   */
  category: PressCategory | null
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
  /** ArticleFileEntry.category와 같은 계약(Task 026) — 값이 없으면 "카테고리 미상". */
  category: PressCategory | null
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
export interface RunArticlesResult {
  items: ArticleFileEntry[]
  total: number
  /**
   * category 필터가 걸려 있고, 카테고리 값이 없어(미상) 제외된 기사 수(Task 026, 21일차 팀장
   * 판정). category 필터를 지정하지 않았으면 항상 0이다.
   */
  uncategorizedCount: number
}

export async function fetchRunArticles(
  runId: string,
  query?: string,
  categories?: PressCategory[]
): Promise<RunArticlesResult> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  for (const category of categories ?? []) params.append('category', category)
  const search = params.toString()
  const response = await fetch(`/api/runs/${runId}/articles${search ? `?${search}` : ''}`)
  return unwrap<RunArticlesResult>(response)
}

/** 기사 본문 단건. 018B(article-preview.tsx)가 쓴다. */
export async function fetchArticleDetail(
  runId: string,
  articleId: string
): Promise<ArticleFileDetail> {
  const response = await fetch(`/api/runs/${runId}/articles/${articleId}`)
  return unwrap<ArticleFileDetail>(response)
}
