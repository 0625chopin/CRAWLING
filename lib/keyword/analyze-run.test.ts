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

function makeArticleMeta(id: string): ArticleListItem {
  return {
    id,
    pressId: 'bloter',
    runId: RUN_ID,
    title: `기사 ${id}`,
    url: `https://example.com/${id}`,
    contentSource: 'rss-summary',
    crawledAt: '2026-08-10T09:00:00.000Z',
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
    const cached = { runId: RUN_ID, analyzedAt: '2026-08-10T09:00:00.000Z', summary: EMPTY_SUMMARY, items: [] }
    readKeywordsMock.mockResolvedValue(cached)

    const result = await analyzeRun(RUN_ID)

    expect(result).toEqual({ file: cached, skippedArticleCount: 0 })
    expect(listArticlesMock).not.toHaveBeenCalled()
    expect(aggregateKeywordsMock).not.toHaveBeenCalled()
    expect(writeKeywordsMock).not.toHaveBeenCalled()
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
