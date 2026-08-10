import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { AnalysisSummary, KeywordCount, PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'

/**
 * `GET /api/runs/[runId]/keywords` 응답 몸통(app/api/runs/[runId]/keywords/route.ts가
 * 돌려주는 `KeywordsResponseBody`와 같은 모양). 원본 타입은 `lib/keyword/keywords-response.ts`
 * 최상단의 `import 'server-only'` 때문에 클라이언트 번들에서 값으로 가져올 수 없어
 * (docs/CONVENTIONS.md §4) 여기서 같은 모양을 다시 선언한다.
 */
export interface KeywordsResult {
  runId: string
  analyzedAt: string
  /** 필터에 흔들리지 않는 전체 기준값이다 — minCount·pos로 items가 줄어도 이 값은 그대로다. */
  summary: AnalysisSummary
  items: KeywordCount[]
  /** 필터 적용 전 전체 키워드 수. */
  totalItemCount: number
  /** 이번 호출에서 새로 건너뛴 기사 수. 캐시를 그대로 읽었으면 항상 0이다. */
  skippedArticleCount: number
  /**
   * category 필터가 걸려 있고, 카테고리 값이 없어(미상) 집계에서 제외된 기사 수(Task 026,
   * 21일차 팀장 판정). category 필터를 지정하지 않았으면 항상 0이다.
   */
  uncategorizedCount: number
  /**
   * category 필터를 적용하기 **전**, 이 run에 저장된 전체 기사 수(21일차, 크롤 파이프라인
   * 교차검증 FAIL 해소). `summary.articleCount`는 필터를 통과한 뒤의 값이라 필터가 기사를
   * 전부 걸러내면 0이 될 수 있다 — `message`가 뜨는지는 이 필드로 판정되고(아래), 화면이
   * "결과 0건"의 원인(원본이 아예 없음 / 카테고리 미상이라 전부 제외 / 카테고리가 안 맞아
   * 전부 제외)을 가를 때도 이 값과 `uncategorizedCount`·`summary.articleCount`를 함께 본다.
   */
  sourceArticleCount: number
  /**
   * **`sourceArticleCount === 0`일 때만 채워진다** — "이 run에 원본 기사 자체가 없다"는 뜻이다.
   * `sourceArticleCount > 0`인데 `items`가 빈 배열이면(카테고리 필터가 전부 걸러냈거나 minCount·
   * pos가 너무 좁아서) 이 필드는 비어 있다 — 그 경우는 화면이 `uncategorizedCount`(미상이라
   * 제외됐는지)와 `summary.articleCount === 0` 여부(카테고리는 있는데 필터와 안 맞는지)로
   * 직접 문구를 조립한다.
   */
  message?: string
}

export interface FetchKeywordsOptions {
  /** 이 값 미만인 키워드를 제외한다. */
  minCount?: number
  /** 지정한 품사만 남긴다. 빈 배열이면 필터하지 않는다(서버와 동일한 규칙). */
  pos?: PosTag[]
  /** 상위 N개만 남긴다. */
  topN?: number
  /** true면 캐시를 무시하고 Kiwi를 다시 돌린다(불용어 추가 후 재분석 등). */
  force?: boolean
  /**
   * 지정한 카테고리에 속한 기사만 다시 집계한다(Task 026). minCount·pos·topN과 달리 캐시
   * 위에서 거르지 않고 서버가 그 자리에서 다시 계산한다 — 요청마다 비용이 있다는 뜻이다.
   * 값이 아직 없는 기사(카테고리 미상)는 **제외된다**(21일차 팀장 판정으로 뒤집힘 —
   * `lib/api/article-category-filter.ts` 상단 주석·`docs/DECISIONS.draft.저장소계층.md` 참고).
   * 제외된 미상 건수는 응답의 `uncategorizedCount`로 온다.
   */
  categories?: PressCategory[]
}

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new Error(body.message)
  }
  return body.data
}

/**
 * run 하나의 키워드 분석 결과를 조회한다. 캐시가 없으면 서버가 자동으로 분석한다
 * (`analyzeRun`, D-033) — 이 함수는 `hasKeywords`를 따로 확인하지 않는다.
 */
export async function fetchKeywords(
  runId: string,
  options: FetchKeywordsOptions = {}
): Promise<KeywordsResult> {
  const params = new URLSearchParams()
  if (options.minCount !== undefined) params.set('minCount', String(options.minCount))
  if (options.pos && options.pos.length > 0) params.set('pos', options.pos.join(','))
  if (options.topN !== undefined) params.set('topN', String(options.topN))
  if (options.force) params.set('force', 'true')
  for (const category of options.categories ?? []) params.append('category', category)

  const query = params.toString()
  const response = await fetch(`/api/runs/${runId}/keywords${query ? `?${query}` : ''}`)
  return unwrap<KeywordsResult>(response)
}
