import { describe, expect, it } from 'vitest'

import type { KeywordsFile } from '@/lib/storage/keyword-repository'
import type { KeywordCount } from '@/lib/types/keyword'

import { buildKeywordsResponseBody } from './keywords-response'

const RUN_ID = '20260810-090000'

const SUMMARY = {
  articleCount: 53,
  totalTokenCount: 17915,
  filteredTokenCount: 12080,
  stopwordExcludedCount: 84,
  uniqueKeywordCount: 4,
}

const ITEMS: KeywordCount[] = [
  { runId: RUN_ID, keyword: 'AI', posTag: 'SL', count: 96 },
  { runId: RUN_ID, keyword: '보안', posTag: 'NNG', count: 57 },
  { runId: RUN_ID, keyword: '반도체', posTag: 'NNG', count: 45 },
  { runId: RUN_ID, keyword: '삼성전자', posTag: 'NNP', count: 2 },
]

function makeFile(overrides: Partial<KeywordsFile> = {}): KeywordsFile {
  return {
    runId: RUN_ID,
    analyzedAt: '2026-08-10T09:00:00.000Z',
    summary: SUMMARY,
    items: ITEMS,
    ...overrides,
  }
}

describe('buildKeywordsResponseBody — summary는 필터에 흔들리지 않는다', () => {
  it('필터 없이도, minCount로 items가 줄어도 summary는 원본과 동일한 참조·값을 유지한다', () => {
    const file = makeFile()

    const unfiltered = buildKeywordsResponseBody(file, {}, 0)
    const filtered = buildKeywordsResponseBody(file, { minCount: 100 }, 0)

    expect(unfiltered.summary).toBe(file.summary)
    expect(filtered.summary).toBe(file.summary)
    expect(filtered.summary).toEqual(unfiltered.summary)
    // 필터로 items는 실제로 줄었는데도 summary.uniqueKeywordCount(4)는 그대로다 — DoD가
    // 요구하는 지점("`?minCount=3`을 주면 3회 미만 키워드가 사라지고 summary는 그대로다").
    expect(filtered.items).toEqual([])
    expect(filtered.summary.uniqueKeywordCount).toBe(4)
  })
})

describe('buildKeywordsResponseBody — totalItemCount', () => {
  it('필터 적용 전 전체 키워드 수를 담고, 필터로 items가 줄어도 바뀌지 않는다', () => {
    const file = makeFile()

    const body = buildKeywordsResponseBody(file, { pos: ['SL'] }, 0)

    expect(body.items).toHaveLength(1)
    expect(body.totalItemCount).toBe(4)
  })
})

describe('buildKeywordsResponseBody — message', () => {
  it('기사 0건 run은 message를 채운다(sourceArticleCount 생략 시 summary.articleCount로 판정)', () => {
    const file = makeFile({
      items: [],
      summary: { ...SUMMARY, articleCount: 0, uniqueKeywordCount: 0 },
    })

    const body = buildKeywordsResponseBody(file, {}, 0)

    expect(body.message).toBe('이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다.')
    expect(body.sourceArticleCount).toBe(0)
  })

  it('기사가 있는 run은 필터(minCount)로 items가 비어도 message를 채우지 않는다', () => {
    const file = makeFile()

    const body = buildKeywordsResponseBody(file, { minCount: 9999 }, 0)

    expect(body.items).toEqual([])
    expect(body.message).toBeUndefined()
  })

  // 크롤 파이프라인 교차검증 FAIL 해소(21일차) — category 필터가 기사를 전부 걸러내
  // summary.articleCount가 0이 돼도, 원본(sourceArticleCount)이 있었다면 "원본이 없다"는
  // message를 띄우면 안 된다. 실서버 재현: 기사 20건 run에 category=sports를 걸었더니 이
  // 메시지가 잘못 떴다.
  it('category 필터로 summary.articleCount가 0이 돼도 sourceArticleCount가 있으면 message를 채우지 않는다', () => {
    const file = makeFile({
      items: [],
      summary: { ...SUMMARY, articleCount: 0, uniqueKeywordCount: 0 },
    })

    // sourceArticleCount를 명시적으로 넘긴다 — 필터로 0건이 됐지만 원본은 20건이었다는 뜻.
    const body = buildKeywordsResponseBody(file, {}, 0, 20, 20)

    expect(body.message).toBeUndefined()
    expect(body.sourceArticleCount).toBe(20)
  })

  it('sourceArticleCount가 진짜 0이면(원본 자체가 없음) category 필터 유무와 무관하게 message를 채운다', () => {
    const file = makeFile({
      items: [],
      summary: { ...SUMMARY, articleCount: 0, uniqueKeywordCount: 0 },
    })

    const body = buildKeywordsResponseBody(file, {}, 0, 0, 0)

    expect(body.message).toBe('이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다.')
  })
})

// 세 가지 "결과 0건" 원인을 화면이 uncategorizedCount·summary.articleCount·sourceArticleCount
// 조합으로 가를 수 있는지 확인한다(팀장 지시 3번 — 서버는 문장을 만들지 않고 숫자만 정확히 준다).
describe('buildKeywordsResponseBody — 결과 0건의 세 원인 구분', () => {
  const emptyItemsFile = () =>
    makeFile({ items: [], summary: { ...SUMMARY, articleCount: 0, uniqueKeywordCount: 0 } })

  it('① 원본 자체가 없음: sourceArticleCount 0 → message 있음', () => {
    const body = buildKeywordsResponseBody(emptyItemsFile(), {}, 0, 0, 0)

    expect(body.sourceArticleCount).toBe(0)
    expect(body.uncategorizedCount).toBe(0)
    expect(body.message).toBeDefined()
  })

  it('② 카테고리 미상이라 전부 제외됨: sourceArticleCount > 0, uncategorizedCount > 0 → message 없음', () => {
    const body = buildKeywordsResponseBody(emptyItemsFile(), {}, 0, 20, 20)

    expect(body.sourceArticleCount).toBe(20)
    expect(body.uncategorizedCount).toBe(20)
    expect(body.summary.articleCount).toBe(0)
    expect(body.message).toBeUndefined()
    // 화면 판정식: sourceArticleCount > 0 && uncategorizedCount > 0 && summary.articleCount === 0
  })

  it('③ 카테고리가 안 맞아 전부 제외됨(미상 아님): sourceArticleCount > 0, uncategorizedCount === 0 → message 없음', () => {
    const body = buildKeywordsResponseBody(emptyItemsFile(), {}, 0, 0, 13)

    expect(body.sourceArticleCount).toBe(13)
    expect(body.uncategorizedCount).toBe(0)
    expect(body.summary.articleCount).toBe(0)
    expect(body.message).toBeUndefined()
    // 화면 판정식: sourceArticleCount > 0 && uncategorizedCount === 0 && summary.articleCount === 0
  })
})

describe('buildKeywordsResponseBody — skippedArticleCount 전달', () => {
  it('인자로 받은 값을 그대로 응답에 싣는다', () => {
    const body = buildKeywordsResponseBody(makeFile(), {}, 2)

    expect(body.skippedArticleCount).toBe(2)
  })
})

// Task 026, 21일차 팀장 판정 — category 필터로 제외된 카테고리 미상 기사 수를 응답에 함께 싣는다.
describe('buildKeywordsResponseBody — uncategorizedCount 전달', () => {
  it('인자를 생략하면 0이다(category 필터 미지정과 같은 뜻)', () => {
    const body = buildKeywordsResponseBody(makeFile(), {}, 0)

    expect(body.uncategorizedCount).toBe(0)
  })

  it('인자로 받은 값을 그대로 응답에 싣는다', () => {
    const body = buildKeywordsResponseBody(makeFile(), {}, 0, 3)

    expect(body.uncategorizedCount).toBe(3)
  })
})
