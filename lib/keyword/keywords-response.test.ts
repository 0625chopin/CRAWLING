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
  it('기사 0건 run은 message를 채운다', () => {
    const file = makeFile({
      items: [],
      summary: { ...SUMMARY, articleCount: 0, uniqueKeywordCount: 0 },
    })

    const body = buildKeywordsResponseBody(file, {}, 0)

    expect(body.message).toBe('이 실행에는 수집된 기사가 없어 분석할 키워드가 없습니다.')
  })

  it('기사가 있는 run은 필터로 items가 비어도 message를 채우지 않는다', () => {
    const file = makeFile()

    const body = buildKeywordsResponseBody(file, { minCount: 9999 }, 0)

    expect(body.items).toEqual([])
    expect(body.message).toBeUndefined()
  })
})

describe('buildKeywordsResponseBody — skippedArticleCount 전달', () => {
  it('인자로 받은 값을 그대로 응답에 싣는다', () => {
    const body = buildKeywordsResponseBody(makeFile(), {}, 2)

    expect(body.skippedArticleCount).toBe(2)
  })
})
