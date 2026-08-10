import 'server-only'

import type { KeywordsFile } from '@/lib/storage/keyword-repository'
import type { AnalysisSummary, KeywordCount } from '@/lib/types/keyword'

import { filterKeywordItems, type KeywordFilterOptions } from './filter-keywords'

/**
 * `GET /api/runs/[runId]/keywords`가 내려주는 몸통. `analyzeRun`의 결과(캐시 또는 방금 분석한
 * 값)와 조건 바 필터를 여기서 합친다 — 021B가 부르는 유일한 진입점이다.
 */
export interface KeywordsResponseBody {
  runId: string
  analyzedAt: string
  /**
   * 항상 전체 집계 기준이다. `minCount`·`pos`로 `items`가 줄어도 이 값은 그대로다
   * (docs/ROADMAP.md Task 021 DoD — "`?minCount=3`을 주면 ... `summary`는 그대로다").
   */
  summary: AnalysisSummary
  items: KeywordCount[]
  /** 필터 적용 전 전체 키워드 수(`summary.uniqueKeywordCount`와 항상 같다). */
  totalItemCount: number
  /** 이번 호출에서 새로 건너뛴 기사 수(D-033). 캐시를 그대로 읽었으면 항상 0이다. */
  skippedArticleCount: number
  /**
   * 기사 0건 run에서만 채운다. 필터 때문에 `items`가 빈 배열이 된 경우(화면 상태 ⑤ "조건에
   * 맞는 키워드가 없습니다")와 구분하기 위해서다 — 이 필드는 "분석할 원본 자체가 없었다"만
   * 나타낸다(ROADMAP 구현 규칙 "존재하지 않는 run, 기사 0건인 run은 각각 404 / 빈 결과 +
   * 안내 메시지로 구분해 응답한다").
   */
  message?: string
}

const EMPTY_RUN_MESSAGE = '이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다.'

export function buildKeywordsResponseBody(
  file: KeywordsFile,
  filterOptions: KeywordFilterOptions,
  skippedArticleCount: number
): KeywordsResponseBody {
  const body: KeywordsResponseBody = {
    runId: file.runId,
    analyzedAt: file.analyzedAt,
    summary: file.summary,
    items: filterKeywordItems(file.items, filterOptions),
    totalItemCount: file.items.length,
    skippedArticleCount,
  }

  if (file.summary.articleCount === 0) {
    body.message = EMPTY_RUN_MESSAGE
  }

  return body
}
