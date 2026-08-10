import 'server-only'

import type { KeywordCount, PosTag } from '@/lib/types/keyword'

/**
 * `keywords.json` 캐시(불용어·1글자 필터까지 적용한 전체 집계) 위에서 조건 바 필터(최소 등장
 * 횟수·품사·표시 개수)를 적용한다. Kiwi를 다시 돌지 않는 순수 함수라 021B가 매 요청마다
 * 다시 불러도 수백 ms 안에 끝난다(docs/ROADMAP.md Task 021 구현 규칙 "캐시와 재분석의 경계").
 */
export interface KeywordFilterOptions {
  /** 이 값 미만인 키워드를 제외한다. 생략하면 필터하지 않는다. */
  minCount?: number
  /** 지정한 품사만 남긴다. 생략하거나 빈 배열이면 필터하지 않는다. */
  pos?: readonly PosTag[]
  /** 필터를 통과한 항목 중 상위 N개만 남긴다. 생략하면 자르지 않는다. */
  topN?: number
}

/**
 * `items`는 항상 빈도 내림차순(동률은 가나다순)으로 정렬돼 들어온다(aggregate.ts). 필터는
 * 상대 순서를 바꾸지 않으므로 `topN`은 필터를 통과한 뒤 앞에서 N개를 자르기만 하면 된다 —
 * 다시 정렬하지 않는다.
 */
export function filterKeywordItems(
  items: readonly KeywordCount[],
  options: KeywordFilterOptions = {}
): KeywordCount[] {
  let result: readonly KeywordCount[] = items

  if (options.minCount !== undefined) {
    const minCount = options.minCount
    result = result.filter((item) => item.count >= minCount)
  }

  if (options.pos && options.pos.length > 0) {
    const allowed = new Set(options.pos)
    result = result.filter((item) => allowed.has(item.posTag))
  }

  if (options.topN !== undefined) {
    result = result.slice(0, options.topN)
  }

  return [...result]
}
