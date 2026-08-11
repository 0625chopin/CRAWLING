import { describe, expect, it } from 'vitest'

import {
  OTHER_DATE_SLOT,
  UNKNOWN_SLOT,
  type DailyBucket,
  type DailyKeywordsFile,
} from '@/lib/storage/daily-keyword-repository'

import {
  buildDailyKeywordItems,
  resolveBucketSlot,
  selectOtherDateArticleCount,
  selectSlotAggregate,
  selectSlotArticleCounts,
  selectUnknownTimeArticleCount,
  toAnalysisSummary,
} from './daily-keywords'

// 여기서 태우는 것은 캐시 위의 순수 합산·비교 로직이다(파일·Kiwi는 건드리지 않는다).
// 버킷 합산과 증감 계산은 틀려도 화면이 멀쩡해 보이는 대표적인 로직이다(CONVENTIONS §9) —
// 카테고리를 하나 빠뜨리거나 직전 구간을 잘못 잡아도 랭킹은 그럴듯한 숫자를 그대로 그린다.

function makeBucket(
  slot: number,
  category: DailyBucket['category'],
  articleCount: number,
  items: DailyBucket['items']
): DailyBucket {
  return {
    slot,
    category,
    articleCount,
    totalTokenCount: articleCount * 100,
    filteredTokenCount: articleCount * 60,
    stopwordExcludedCount: articleCount * 5,
    items,
  }
}

const FILE: DailyKeywordsFile = {
  version: 2,
  date: '20260811',
  builtAt: '2026-08-11T01:00:00.000Z',
  countBasis: 'article',
  stopwordSignature: '0-test',
  runIds: ['20260811-000000', '20260811-070000'],
  seenUrls: ['https://example.com/a'],
  buckets: [
    // 0~3시
    makeBucket(0, 'it-ai', 4, [
      { keyword: '반도체', posTag: 'NNG', count: 3 },
      { keyword: '실적', posTag: 'NNG', count: 1 },
    ]),
    makeBucket(0, 'sports', 2, [{ keyword: '반도체', posTag: 'NNG', count: 1 }]),
    // 4~6시
    makeBucket(1, 'it-ai', 6, [
      { keyword: '반도체', posTag: 'NNG', count: 5 },
      { keyword: '관세', posTag: 'NNG', count: 2 },
    ]),
    // 발행 시각 미상
    makeBucket(UNKNOWN_SLOT, 'it-ai', 3, [{ keyword: '반도체', posTag: 'NNG', count: 3 }]),
    // 다른 날 발행(피드에 남아 있던 전날 기사)
    makeBucket(OTHER_DATE_SLOT, 'it-ai', 2, [{ keyword: '환율', posTag: 'NNG', count: 2 }]),
    // 카테고리 미상
    makeBucket(1, 'unknown', 5, [{ keyword: '증시', posTag: 'NNG', count: 4 }]),
  ],
}

// 발행 날짜를 보지 않고 시(hour)만 보면 어제 14시 기사가 오늘의 13~15시 집계로 들어간다 —
// 랭킹은 멀쩡한 숫자를 그대로 그려서 눈으로는 잡히지 않는다(실측으로 11:19 크롤에 13~15시
// 6건이 잡혔던 결함).
describe('resolveBucketSlot — 날짜가 같을 때만 구간에 넣는다', () => {
  const DATE = '20260811'
  const atLocal = (day: number, hour: number) => new Date(2026, 7, day, hour, 0).toISOString()

  it('같은 날 발행이면 시각에 맞는 구간이다', () => {
    expect(resolveBucketSlot(atLocal(11, 14), DATE)).toBe(4) // 13~15시
  })

  it('전날 같은 시각이면 구간이 아니라 OTHER_DATE_SLOT이다', () => {
    expect(resolveBucketSlot(atLocal(10, 14), DATE)).toBe(OTHER_DATE_SLOT)
  })

  it('발행 시각이 없거나 깨졌으면 UNKNOWN_SLOT이다', () => {
    expect(resolveBucketSlot(undefined, DATE)).toBe(UNKNOWN_SLOT)
    expect(resolveBucketSlot('알 수 없음', DATE)).toBe(UNKNOWN_SLOT)
  })
})

describe('selectSlotAggregate — 버킷 합산', () => {
  it('같은 구간의 카테고리 버킷을 합산한다', () => {
    const aggregate = selectSlotAggregate(FILE, 0, undefined)

    expect(aggregate.articleCount).toBe(6) // it-ai 4 + sports 2
    expect(aggregate.items.get('반도체')?.count).toBe(4) // 3 + 1
    expect(aggregate.items.get('실적')?.count).toBe(1)
  })

  it('카테고리 필터를 걸면 그 카테고리 버킷만 남는다', () => {
    const aggregate = selectSlotAggregate(FILE, 0, ['it-ai'])

    expect(aggregate.articleCount).toBe(4)
    expect(aggregate.items.get('반도체')?.count).toBe(3)
  })

  // 카테고리 미상은 필터가 걸리면 제외되고, 그 건수는 조용히 사라지지 않고 보고된다
  // (article-category-filter.ts의 21일차 판정과 같은 계약).
  it('카테고리 필터가 있으면 미상 버킷은 제외하고 uncategorizedCount로 센다', () => {
    const filtered = selectSlotAggregate(FILE, 1, ['it-ai'])
    expect(filtered.articleCount).toBe(6)
    expect(filtered.uncategorizedCount).toBe(5)
    expect(filtered.items.has('증시')).toBe(false)

    const unfiltered = selectSlotAggregate(FILE, 1, undefined)
    expect(unfiltered.articleCount).toBe(11) // 미상 5건도 포함
    expect(unfiltered.uncategorizedCount).toBe(0) // 필터가 없으면 "제외된 건"도 없다
    expect(unfiltered.items.get('증시')?.count).toBe(4)
  })

  it('slot이 null이면 구간에 못 넣은 버킷까지 포함한 하루 전체다', () => {
    const aggregate = selectSlotAggregate(FILE, null, undefined)

    expect(aggregate.articleCount).toBe(22) // 4 + 2 + 6 + 3 + 2 + 5
    expect(aggregate.items.get('반도체')?.count).toBe(12) // 3 + 1 + 5 + 3
  })
})

describe('slotArticleCounts / 구간에 못 넣은 기사', () => {
  it('구간별 기사 수 8개를 돌려주고, 시각 미상·다른 날 발행은 거기에 섞이지 않는다', () => {
    expect(selectSlotArticleCounts(FILE, undefined)).toEqual([6, 11, 0, 0, 0, 0, 0, 0])
    expect(selectUnknownTimeArticleCount(FILE, undefined)).toBe(3)
    expect(selectOtherDateArticleCount(FILE, undefined)).toBe(2)
  })
})

describe('buildDailyKeywordItems — 직전 구간 대비 증감', () => {
  it('증감은 선택 구간 - 직전 구간이며 빈도 내림차순으로 정렬된다', () => {
    const current = selectSlotAggregate(FILE, 1, ['it-ai'])
    const previous = selectSlotAggregate(FILE, 0, ['it-ai'])

    const items = buildDailyKeywordItems(current, previous)

    expect(items.map((item) => item.keyword)).toEqual(['반도체', '관세'])
    expect(items[0]).toMatchObject({ count: 5, previousCount: 3, delta: 2 })
  })

  // 0과 null은 다른 뜻이다 — 0은 "직전 구간에 한 건도 없었다"(신규), null은 "비교 자체가 없다".
  it('직전 구간에 없던 키워드는 previousCount 0(신규)이다', () => {
    const items = buildDailyKeywordItems(
      selectSlotAggregate(FILE, 1, ['it-ai']),
      selectSlotAggregate(FILE, 0, ['it-ai'])
    )

    expect(items.find((item) => item.keyword === '관세')).toMatchObject({
      count: 2,
      previousCount: 0,
      delta: 2,
    })
  })

  it('비교 대상 구간이 없으면(previous가 null) previousCount·delta가 null이다', () => {
    const items = buildDailyKeywordItems(selectSlotAggregate(FILE, 0, undefined), null)

    expect(items.every((item) => item.previousCount === null && item.delta === null)).toBe(true)
  })

  // 직전 구간에만 있는 키워드까지 끌어오면 "이 시간대 랭킹"이 아니라 두 구간의 합집합이 된다.
  it('직전 구간에만 있는 키워드는 목록에 넣지 않는다', () => {
    const items = buildDailyKeywordItems(
      selectSlotAggregate(FILE, 1, ['it-ai']),
      selectSlotAggregate(FILE, 0, ['it-ai'])
    )

    expect(items.some((item) => item.keyword === '실적')).toBe(false)
  })
})

describe('toAnalysisSummary', () => {
  it('고유 키워드 수는 합산 후의 키 개수다', () => {
    const summary = toAnalysisSummary(selectSlotAggregate(FILE, 0, undefined))

    expect(summary).toEqual({
      articleCount: 6,
      totalTokenCount: 600,
      filteredTokenCount: 360,
      stopwordExcludedCount: 30,
      uniqueKeywordCount: 2, // 반도체·실적 — 두 버킷에 걸친 반도체를 두 번 세지 않는다
    })
  })
})
