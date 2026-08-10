import { describe, expect, it } from 'vitest'

import type { KeywordCount } from '@/lib/types/keyword'

import { filterKeywordItems } from './filter-keywords'

const RUN_ID = '20260810-090000'

/** aggregate.ts가 만드는 순서(빈도 내림차순, 동률은 가나다순)를 그대로 흉내 낸 고정 픽스처. */
const ITEMS: KeywordCount[] = [
  { runId: RUN_ID, keyword: 'AI', posTag: 'SL', count: 10 },
  { runId: RUN_ID, keyword: '반도체', posTag: 'NNG', count: 8 },
  { runId: RUN_ID, keyword: '삼성전자', posTag: 'NNP', count: 5 },
  { runId: RUN_ID, keyword: '공개', posTag: 'NNG', count: 3 },
  { runId: RUN_ID, keyword: '오픈AI', posTag: 'NNP', count: 3 },
  { runId: RUN_ID, keyword: '기자', posTag: 'NNG', count: 1 },
]

describe('filterKeywordItems — 옵션 없음', () => {
  it('원본과 같은 순서·값을 그대로 돌려준다(다른 배열 인스턴스)', () => {
    const result = filterKeywordItems(ITEMS)

    expect(result).toEqual(ITEMS)
    expect(result).not.toBe(ITEMS)
  })
})

describe('filterKeywordItems — minCount', () => {
  it('경계값 미만인 키워드만 제외하고, 경계값과 같은 것은 남긴다', () => {
    const result = filterKeywordItems(ITEMS, { minCount: 3 })

    expect(result.map((item) => item.keyword)).toEqual(['AI', '반도체', '삼성전자', '공개', '오픈AI'])
  })

  it('전부 미만이면 빈 배열이다', () => {
    const result = filterKeywordItems(ITEMS, { minCount: 999 })

    expect(result).toEqual([])
  })
})

describe('filterKeywordItems — pos', () => {
  it('지정한 품사만 남기고 나머지는 제외한다', () => {
    const result = filterKeywordItems(ITEMS, { pos: ['NNP'] })

    expect(result.map((item) => item.keyword)).toEqual(['삼성전자', '오픈AI'])
  })

  it('복수 품사를 지정하면 합집합으로 남긴다', () => {
    const result = filterKeywordItems(ITEMS, { pos: ['NNP', 'SL'] })

    expect(result.map((item) => item.keyword)).toEqual(['AI', '삼성전자', '오픈AI'])
  })

  it('빈 배열이면 필터하지 않는다(전체 유지)', () => {
    const result = filterKeywordItems(ITEMS, { pos: [] })

    expect(result).toEqual(ITEMS)
  })
})

describe('filterKeywordItems — topN', () => {
  it('필터를 통과한 항목 중 앞에서 N개만 남기고 순서는 바꾸지 않는다', () => {
    const result = filterKeywordItems(ITEMS, { topN: 3 })

    expect(result.map((item) => item.keyword)).toEqual(['AI', '반도체', '삼성전자'])
  })

  it('N이 전체 개수보다 크면 전부 반환한다', () => {
    const result = filterKeywordItems(ITEMS, { topN: 999 })

    expect(result).toEqual(ITEMS)
  })
})

describe('filterKeywordItems — 조합', () => {
  it('minCount·pos·topN을 함께 적용하면 순서대로(먼저 minCount·pos로 거르고 topN으로 자른다)', () => {
    const result = filterKeywordItems(ITEMS, { minCount: 3, pos: ['NNG', 'NNP'], topN: 2 })

    // minCount>=3 && pos in {NNG,NNP} → 반도체(8) 삼성전자(5) 공개(3) 오픈AI(3), topN=2로 상위 2개만.
    expect(result.map((item) => item.keyword)).toEqual(['반도체', '삼성전자'])
  })
})

describe('filterKeywordItems — 빈 입력', () => {
  it('items가 빈 배열이면 어떤 옵션을 줘도 빈 배열이다', () => {
    expect(filterKeywordItems([], { minCount: 1, pos: ['NNG'], topN: 10 })).toEqual([])
  })
})
