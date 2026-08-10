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
   * category 필터가 걸려 있고, 카테고리 값이 없어(미상) 집계에서 제외된 기사 수(Task 026,
   * 21일차 팀장 판정). category 필터를 지정하지 않았으면 항상 0이다 — 화면이 "카테고리 미상
   * N건은 제외했습니다"를 이 값으로 보여준다.
   */
  uncategorizedCount: number
  /**
   * category 필터를 적용하기 **전**, 이 run에 저장된 전체 기사 수(`analyzeRun`의
   * `AnalyzeRunResult.sourceArticleCount`를 그대로 옮긴다, 크롤 파이프라인 교차검증 FAIL 해소,
   * 21일차). `summary.articleCount`(위)는 category 필터를 통과한 뒤의 값이라 필터가 전부
   * 걸러내면 0이 되는데, 이 필드는 그 필터와 무관하게 항상 "이 run에 기사가 원래 몇 건
   * 있었는가"를 말한다 — `message`가 언제 뜨는지 판정하는 기준이자(바로 아래), 화면이 "결과
   * 0건"의 세 원인(원본 자체가 없음 / 카테고리 미상이라 전부 제외 / 카테고리가 안 맞아 전부
   * 제외)을 가르는 데 필요한 값이다.
   */
  sourceArticleCount: number
  /**
   * **`sourceArticleCount === 0`일 때만 채운다** — "분석할 원본 자체가 없었다"만 나타낸다
   * (ROADMAP 구현 규칙 "존재하지 않는 run, 기사 0건인 run은 각각 404 / 빈 결과 + 안내
   * 메시지로 구분해 응답한다"). **`summary.articleCount === 0`을 기준으로 삼지 않는다** —
   * category 필터가 기사를 전부 걸러내도 `summary.articleCount`는 0이 되는데, 그건 "원본이
   * 없다"가 아니라 "원본은 있는데 필터로 다 빠졌다"이다(이 필드를 `summary.articleCount`로
   * 잘못 판정했던 21일차 결함 — 기사 20건짜리 run에 이 메시지가 뜨는 것으로 크롤 파이프라인이
   * 실서버에서 재현했다).
   *
   * `sourceArticleCount > 0`인데 `items`가 빈 배열인 두 경우는 이 필드로 설명하지 않는다 —
   * 화면이 `uncategorizedCount`(카테고리 미상이라 제외됨)와 `summary.articleCount === 0`
   * 여부(카테고리는 다 있는데 필터와 안 맞아 전부 제외됨, `uncategorizedCount === 0`일 때)로
   * 직접 갈라 문구를 조립한다 — 서버가 미리 문장을 만들지 않는 이유는 이 두 경우가 화면의
   * 카테고리 필터 UI 상태(사용자가 실제로 무엇을 골랐는지)를 알아야 자연스러운 한국어 문장이
   * 되기 때문이다.
   */
  message?: string
}

const EMPTY_RUN_MESSAGE = '이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다.'

/**
 * `sourceArticleCount`를 생략하면 `file.summary.articleCount`를 그대로 쓴다 — category 필터가
 * 없는 호출(대다수 기존 호출부·테스트)에서는 두 값이 항상 같으므로(필터가 없으면 걸러낼 것도
 * 없다) 이 기본값으로 하위 호환이 유지된다. category 필터가 있는 호출(`analyzeRun`이 돌려주는
 * `sourceArticleCount`)만 명시적으로 넘기면 된다.
 */
export function buildKeywordsResponseBody(
  file: KeywordsFile,
  filterOptions: KeywordFilterOptions,
  skippedArticleCount: number,
  uncategorizedCount = 0,
  sourceArticleCount: number = file.summary.articleCount
): KeywordsResponseBody {
  const body: KeywordsResponseBody = {
    runId: file.runId,
    analyzedAt: file.analyzedAt,
    summary: file.summary,
    items: filterKeywordItems(file.items, filterOptions),
    totalItemCount: file.items.length,
    skippedArticleCount,
    uncategorizedCount,
    sourceArticleCount,
  }

  // sourceArticleCount(필터 전 원본)가 기준이다 — summary.articleCount(필터 후)가 아니다.
  // 카테고리 필터가 기사를 전부 걸러내도 원본은 있었을 수 있다(21일차 결함 해소, 위 message
  // docstring 참고).
  if (sourceArticleCount === 0) {
    body.message = EMPTY_RUN_MESSAGE
  }

  return body
}
