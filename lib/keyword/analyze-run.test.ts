import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArticleListItem } from '@/lib/types/article'

/**
 * analyze-run.ts는 fs(article/keyword/run/stopword 저장소)와 Kiwi(aggregate.ts 경유)를 둘 다
 * 타므로, 순수 오케스트레이션 로직(기사 → 텍스트 조립, 0건 처리, 실패 격리, keywords.json 형태,
 * 캐시 분기)만 태우려면 다섯 계층을 전부 스텁으로 바꾼다(lib/crawler/run-manager.test.ts와 같은
 * 패턴). **Kiwi 실행 자체는 이 스위트에 넣지 않는다** — 105MB 모델 로딩이 테스트를 느리게 만든다
 * (실제 Kiwi 결과 검증은 aggregate.test.ts·extract.test.ts가 이미 담당한다).
 */

const getRunMock = vi.fn()
vi.mock('@/lib/storage/run-repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage/run-repository')>()
  return {
    RunNotFoundError: actual.RunNotFoundError,
    getRun: (...args: unknown[]) => getRunMock(...args),
  }
})

const listArticlesMock = vi.fn()
const readArticleMock = vi.fn()
vi.mock('@/lib/storage/article-repository', () => ({
  listArticles: (...args: unknown[]) => listArticlesMock(...args),
  readArticle: (...args: unknown[]) => readArticleMock(...args),
}))

const hasKeywordsMock = vi.fn()
const readKeywordsMock = vi.fn()
const writeKeywordsMock = vi.fn()
vi.mock('@/lib/storage/keyword-repository', () => ({
  // 집계 기준 마커는 상수라 스텁으로 바꿀 이유가 없다 — 실제 값을 그대로 쓴다. 목으로 만들면
  // "코드가 쓰는 값"과 "테스트가 기대하는 값"이 갈려 캐시 무효화 회귀를 못 잡는다.
  CURRENT_COUNT_BASIS: 'article',
  hasKeywords: (...args: unknown[]) => hasKeywordsMock(...args),
  readKeywords: (...args: unknown[]) => readKeywordsMock(...args),
  writeKeywords: (...args: unknown[]) => writeKeywordsMock(...args),
}))

const getStopwordSetMock = vi.fn()
vi.mock('@/lib/storage/stopword-repository', () => ({
  getStopwordSet: (...args: unknown[]) => getStopwordSetMock(...args),
}))

const aggregateKeywordsMock = vi.fn()
vi.mock('./aggregate', () => ({
  aggregateKeywords: (...args: unknown[]) => aggregateKeywordsMock(...args),
}))

const { analyzeRun } = await import('./analyze-run')
const { RunNotFoundError } = await import('@/lib/storage/run-repository')

const RUN_ID = '20260810-090000'

function makeArticleMeta(id: string, overrides: Partial<ArticleListItem> = {}): ArticleListItem {
  return {
    id,
    pressId: 'bloter',
    runId: RUN_ID,
    title: `기사 ${id}`,
    url: `https://example.com/${id}`,
    contentSource: 'rss-summary',
    crawledAt: '2026-08-10T09:00:00.000Z',
    ...overrides,
  }
}

const EMPTY_SUMMARY = {
  articleCount: 0,
  totalTokenCount: 0,
  filteredTokenCount: 0,
  stopwordExcludedCount: 0,
  uniqueKeywordCount: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  getRunMock.mockResolvedValue({ id: RUN_ID })
  getStopwordSetMock.mockResolvedValue(new Set())
  hasKeywordsMock.mockResolvedValue(false)
  aggregateKeywordsMock.mockResolvedValue({ summary: EMPTY_SUMMARY, items: [] })
})

describe('analyzeRun — 없는 run', () => {
  it('getRun이 던지는 RunNotFoundError를 그대로 흘려보내고 그 뒤 아무것도 부르지 않는다', async () => {
    getRunMock.mockRejectedValue(new RunNotFoundError(RUN_ID))

    await expect(analyzeRun(RUN_ID)).rejects.toBeInstanceOf(RunNotFoundError)
    expect(listArticlesMock).not.toHaveBeenCalled()
    expect(hasKeywordsMock).not.toHaveBeenCalled()
  })
})

describe('analyzeRun — 기사 0건인 run', () => {
  it('예외를 던지지 않고 items: []인 정상 결과를 반환·기록한다', async () => {
    listArticlesMock.mockResolvedValue([])

    const result = await analyzeRun(RUN_ID)

    expect(aggregateKeywordsMock).toHaveBeenCalledWith(RUN_ID, [], new Set())
    expect(result.file.items).toEqual([])
    expect(result.file.summary).toEqual(EMPTY_SUMMARY)
    expect(result.skippedArticleCount).toBe(0)
    expect(writeKeywordsMock).toHaveBeenCalledOnce()
  })
})

describe('analyzeRun — 기사 → 텍스트 조립', () => {
  it('listArticles 순서대로 readArticle을 불러 본문만 aggregateKeywords에 넘긴다', async () => {
    listArticlesMock.mockResolvedValue([makeArticleMeta('0001'), makeArticleMeta('0002')])
    readArticleMock.mockImplementation(async (_runId: string, articleId: string) => ({
      id: articleId,
      content: `본문 ${articleId}`,
    }))

    await analyzeRun(RUN_ID)

    expect(readArticleMock).toHaveBeenNthCalledWith(1, RUN_ID, '0001')
    expect(readArticleMock).toHaveBeenNthCalledWith(2, RUN_ID, '0002')
    expect(aggregateKeywordsMock).toHaveBeenCalledWith(
      RUN_ID,
      ['본문 0001', '본문 0002'],
      new Set()
    )
  })
})

describe('analyzeRun — 개별 기사 실패 격리', () => {
  it('한 기사가 손상돼도 나머지는 그대로 처리하고 건너뛴 수를 센다', async () => {
    listArticlesMock.mockResolvedValue([
      makeArticleMeta('0001'),
      makeArticleMeta('0002'),
      makeArticleMeta('0003'),
    ])
    readArticleMock.mockImplementation(async (_runId: string, articleId: string) => {
      if (articleId === '0002') throw new Error('메타 라인 손상')
      return { id: articleId, content: `본문 ${articleId}` }
    })

    const result = await analyzeRun(RUN_ID)

    expect(result.skippedArticleCount).toBe(1)
    expect(aggregateKeywordsMock).toHaveBeenCalledWith(
      RUN_ID,
      ['본문 0001', '본문 0003'],
      new Set()
    )
    // 손상된 기사가 있어도 나머지 결과는 정상적으로 기록된다 — run 전체가 무너지지 않는다.
    expect(writeKeywordsMock).toHaveBeenCalledOnce()
  })
})

describe('analyzeRun — keywords.json 형태', () => {
  it('writeKeywords에 { runId, analyzedAt(ISO), summary, items } 형태로 기록한다', async () => {
    listArticlesMock.mockResolvedValue([])
    const items = [{ runId: RUN_ID, keyword: 'AI', posTag: 'SL' as const, count: 3 }]
    aggregateKeywordsMock.mockResolvedValue({ summary: EMPTY_SUMMARY, items })

    const result = await analyzeRun(RUN_ID)

    expect(writeKeywordsMock).toHaveBeenCalledWith(RUN_ID, result.file)
    expect(result.file.runId).toBe(RUN_ID)
    expect(result.file.items).toBe(items)
    // ISO 8601(오프셋 포함) 문자열인지 — Date 생성자가 파싱 가능하고 왕복해도 같은 값이어야 한다.
    expect(new Date(result.file.analyzedAt).toISOString()).toBe(result.file.analyzedAt)
  })
})

describe('analyzeRun — 캐시 우선', () => {
  it('force가 아니고 캐시가 있으면 readKeywords만 부르고 Kiwi 경로(aggregate)는 건드리지 않는다', async () => {
    hasKeywordsMock.mockResolvedValue(true)
    const cachedSummary = { ...EMPTY_SUMMARY, articleCount: 5 }
    const cached = {
      runId: RUN_ID,
      analyzedAt: '2026-08-10T09:00:00.000Z',
      countBasis: 'article' as const,
      summary: cachedSummary,
      items: [],
    }
    readKeywordsMock.mockResolvedValue(cached)

    const result = await analyzeRun(RUN_ID)

    expect(result).toEqual({
      file: cached,
      skippedArticleCount: 0,
      uncategorizedCount: 0,
      // 캐시 적중 경로는 listArticles를 다시 부르지 않고 캐시 자체의 articleCount를
      // sourceArticleCount로 쓴다(analyze-run.ts AnalyzeRunResult.sourceArticleCount docstring).
      sourceArticleCount: 5,
    })
    expect(listArticlesMock).not.toHaveBeenCalled()
    expect(aggregateKeywordsMock).not.toHaveBeenCalled()
    expect(writeKeywordsMock).not.toHaveBeenCalled()
  })

  // countBasis가 없는 파일은 집계 기준이 바뀌기 전(총 등장 횟수)에 만들어진 캐시다. 두 값은
  // 똑같이 생긴 정수라 그대로 읽히면 랭킹이 조용히 옛 기준으로 표시된다 — 형식 검증으로는
  // 걸러지지 않는 종류의 회귀라 여기서 못박는다(keyword-repository.ts의 countBasis 주석).
  it('countBasis가 없는 옛 기준 캐시는 무시하고 다시 집계해 덮어쓴다', async () => {
    hasKeywordsMock.mockResolvedValue(true)
    readKeywordsMock.mockResolvedValue({
      runId: RUN_ID,
      analyzedAt: '2026-08-10T09:00:00.000Z',
      summary: { ...EMPTY_SUMMARY, articleCount: 5 },
      items: [{ runId: RUN_ID, keyword: '모델', posTag: 'NNG' as const, count: 244 }],
    })
    listArticlesMock.mockResolvedValue([])

    const result = await analyzeRun(RUN_ID)

    expect(aggregateKeywordsMock).toHaveBeenCalledOnce()
    expect(writeKeywordsMock).toHaveBeenCalledOnce()
    expect(result.file.countBasis).toBe('article')
  })

  it('force: true면 캐시가 있어도 무시하고 다시 분석한다(hasKeywords조차 확인하지 않는다)', async () => {
    listArticlesMock.mockResolvedValue([])

    await analyzeRun(RUN_ID, { force: true })

    expect(hasKeywordsMock).not.toHaveBeenCalled()
    expect(readKeywordsMock).not.toHaveBeenCalled()
    expect(aggregateKeywordsMock).toHaveBeenCalledOnce()
    expect(writeKeywordsMock).toHaveBeenCalledOnce()
  })
})

// Task 026 — categories가 지정되면 run 전체 캐시(keywords.json)를 읽지도 쓰지도 않고, 그 자리에서
// 부분집합만 다시 집계한다. 21일차 팀장 판정으로 카테고리 값이 없는 기사(미상)는 필터가 걸리면
// 제외된다(matchesCategoryFilter 계약, article-category-filter.ts 상단 주석) — 처음에는 반대로
// (미상은 포함) 구현했었다.
describe('analyzeRun — categories 필터', () => {
  it('캐시가 있어도 categories가 지정되면 무시하고 새로 집계하며, keywords.json에 쓰지 않는다', async () => {
    hasKeywordsMock.mockResolvedValue(true)
    listArticlesMock.mockResolvedValue([makeArticleMeta('0001', { category: 'sports' })])
    readArticleMock.mockResolvedValue({ id: '0001', content: '본문 0001' })

    await analyzeRun(RUN_ID, { categories: ['sports'] })

    expect(readKeywordsMock).not.toHaveBeenCalled()
    expect(aggregateKeywordsMock).toHaveBeenCalledOnce()
    expect(writeKeywordsMock).not.toHaveBeenCalled()
  })

  it('요청한 카테고리와 다른 기사도, 카테고리 미상 기사도 제외한다', async () => {
    listArticlesMock.mockResolvedValue([
      makeArticleMeta('0001', { category: 'sports' }),
      makeArticleMeta('0002', { category: 'economy' }),
      makeArticleMeta('0003'), // category 없음 — 카테고리 미상
    ])
    readArticleMock.mockImplementation(async (_runId: string, articleId: string) => ({
      id: articleId,
      content: `본문 ${articleId}`,
    }))

    await analyzeRun(RUN_ID, { categories: ['sports'] })

    expect(aggregateKeywordsMock).toHaveBeenCalledWith(RUN_ID, ['본문 0001'], new Set())
  })

  it('제외된 미상 기사 수를 uncategorizedCount로 돌려준다', async () => {
    listArticlesMock.mockResolvedValue([
      makeArticleMeta('0001', { category: 'sports' }),
      makeArticleMeta('0002'), // 미상
      makeArticleMeta('0003'), // 미상
    ])
    readArticleMock.mockImplementation(async (_runId: string, articleId: string) => ({
      id: articleId,
      content: `본문 ${articleId}`,
    }))

    const result = await analyzeRun(RUN_ID, { categories: ['sports'] })

    expect(result.uncategorizedCount).toBe(2)
  })

  it('categories를 지정하지 않으면 uncategorizedCount는 항상 0이다', async () => {
    listArticlesMock.mockResolvedValue([makeArticleMeta('0001')]) // 미상이어도 필터가 없으면 무관

    const result = await analyzeRun(RUN_ID)

    expect(result.uncategorizedCount).toBe(0)
  })

  it('categories를 지정하지 않으면 지금까지와 같이 전체를 집계하고 캐시에 기록한다', async () => {
    listArticlesMock.mockResolvedValue([makeArticleMeta('0001', { category: 'sports' })])
    readArticleMock.mockResolvedValue({ id: '0001', content: '본문 0001' })

    await analyzeRun(RUN_ID)

    expect(aggregateKeywordsMock).toHaveBeenCalledWith(RUN_ID, ['본문 0001'], new Set())
    expect(writeKeywordsMock).toHaveBeenCalledOnce()
  })
})

// 크롤 파이프라인 교차검증 FAIL 해소(21일차) — sourceArticleCount는 category 필터를 적용하기
// 전의 원본 기사 수다. summary.articleCount(필터 후)와 반드시 갈라져야 하는 지점이 바로
// "카테고리가 전부 안 맞아 결과가 0건"인 경우다 — 실서버 재현(`?category=stock`인데 run은
// sports 기사만 있던 사례)이 정확히 이 시나리오였다.
describe('analyzeRun — sourceArticleCount(category 필터 전 원본 수)', () => {
  it('무필터 경로에서는 캐시에 쓰이는 articleList.length와 같다(읽기 실패로 줄어들지 않는다)', async () => {
    listArticlesMock.mockResolvedValue([
      makeArticleMeta('0001'),
      makeArticleMeta('0002'),
      makeArticleMeta('0003'),
    ])
    readArticleMock.mockImplementation(async (_runId: string, articleId: string) => {
      if (articleId === '0002') throw new Error('메타 라인 손상')
      return { id: articleId, content: `본문 ${articleId}` }
    })
    // aggregateKeywords는 스텁이라 실제로 세지 않는다 — 실제로 읽기에 성공한 2건이
    // aggregateKeywords에 넘어갔다는 것은 위 "개별 기사 실패 격리" 스위트가 이미 확인했으므로,
    // 여기서는 그 결과(summary.articleCount: 2)를 명시적으로 흉내 내 sourceArticleCount(3)와
    // 값이 갈린다는 것만 확인한다.
    aggregateKeywordsMock.mockResolvedValueOnce({
      summary: { ...EMPTY_SUMMARY, articleCount: 2 },
      items: [],
    })

    const result = await analyzeRun(RUN_ID)

    // 원본은 3건이지만 1건 읽기 실패로 summary.articleCount(집계된 수)는 2건이다 — 두 값이
    // 다르다는 것 자체가 이 필드가 필요한 이유다.
    expect(result.sourceArticleCount).toBe(3)
    expect(result.file.summary.articleCount).toBe(2)
  })

  it('카테고리 필터가 전부 걸러내도(미상 0건, 전부 카테고리 불일치) sourceArticleCount는 원본 수를 그대로 유지한다', async () => {
    // run에 sports 기사만 3건 있는데 stock으로 필터한 상황 — 크롤 파이프라인 실서버 재현과 같다.
    listArticlesMock.mockResolvedValue([
      makeArticleMeta('0001', { category: 'sports' }),
      makeArticleMeta('0002', { category: 'sports' }),
      makeArticleMeta('0003', { category: 'sports' }),
    ])

    const result = await analyzeRun(RUN_ID, { categories: ['stock'] })

    expect(result.sourceArticleCount).toBe(3)
    expect(result.uncategorizedCount).toBe(0) // 미상은 없다 — 전부 카테고리가 있는데 안 맞을 뿐
    expect(result.file.summary.articleCount).toBe(0) // 집계에 들어간 기사는 0건
    // 세 값을 종합하면 화면이 "원본 없음"(sourceArticleCount 0)과 "카테고리 불일치"(0이 아닌
    // sourceArticleCount + uncategorizedCount 0 + summary.articleCount 0)를 가를 수 있다.
    expect(readArticleMock).not.toHaveBeenCalled() // 필터를 통과한 기사가 없으니 읽지도 않는다
  })

  it('진짜 원본 0건인 run은 sourceArticleCount도 0이다', async () => {
    listArticlesMock.mockResolvedValue([])

    const result = await analyzeRun(RUN_ID, { categories: ['sports'] })

    expect(result.sourceArticleCount).toBe(0)
    expect(result.uncategorizedCount).toBe(0)
  })
})
