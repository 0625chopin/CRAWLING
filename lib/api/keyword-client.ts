import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { AnalysisSummary, KeywordCount, PosTag } from '@/lib/types/keyword'

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
  /** 기사 0건 run에서만 채워진다. */
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

  const query = params.toString()
  const response = await fetch(`/api/runs/${runId}/keywords${query ? `?${query}` : ''}`)
  return unwrap<KeywordsResult>(response)
}
