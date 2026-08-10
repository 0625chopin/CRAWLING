import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Article } from '@/lib/types/article'
import type { CrawlRun } from '@/lib/types/crawl-run'
import type { HtmlPressSource, RssPressSource } from '@/lib/types/press'

import type { PressCrawlHooks, PressCrawlResult } from './press-crawler'
import { abortRun, getRunProgress, startRun } from './run-manager'

/**
 * run-manager는 저장소(fs 경유)와 press-crawler(Playwright·네트워크)를 직접 부르므로
 * 순수 로직(전역 순번 배정·진행 상태 갱신·집계)만 태우려면 세 계층을 전부 스텁으로 바꾼다
 * (lib/crawler/press-crawler.test.ts와 같은 패턴). vi.mock은 파일 상단으로 끌어올려지므로
 * import 아래 적어도 적용된다.
 *
 * 실제 fs 쓰기·HMR 생존·1초 이내 응답 같은 실측 항목은 이 스위트가 아니라 회차 보고서에
 * 따로 남긴다(docs/CONVENTIONS.md §9 — vitest는 순수 함수 전용).
 */

const getPressMock = vi.fn()
vi.mock('@/lib/storage/press-repository', () => ({
  getPress: (...args: unknown[]) => getPressMock(...args),
}))

const createRunMock = vi.fn()
const finishRunMock = vi.fn()
vi.mock('@/lib/storage/run-repository', () => ({
  createRun: (...args: unknown[]) => createRunMock(...args),
  finishRun: (...args: unknown[]) => finishRunMock(...args),
}))

const saveArticleMock = vi.fn()
vi.mock('@/lib/storage/article-repository', () => ({
  saveArticle: (...args: unknown[]) => saveArticleMock(...args),
}))

const crawlPressMock = vi.fn()
vi.mock('./press-crawler', () => ({
  crawlPress: (...args: unknown[]) => crawlPressMock(...args),
}))

vi.mock('./config', () => ({
  crawlerConfig: {
    concurrency: 2,
    delayMs: 0,
    timeoutMs: 5000,
    channel: undefined,
    headless: true,
    userAgent: 'vitest',
    // 두 언론사를 동시에 굴려도 순번 배정이 겹치지 않는지 확인하려고 넉넉히 둔다.
    pressConcurrency: 5,
  },
}))

const RUN_ID = '20260810-090000'

function makeRssPress(id: string, name: string): RssPressSource {
  return { id, name, isActive: true, sourceType: 'rss', feedUrl: `https://example.com/${id}.xml` }
}

function makeHtmlPress(id: string, name: string): HtmlPressSource {
  return {
    id,
    name,
    isActive: true,
    sourceType: 'html',
    listUrl: `https://example.com/${id}`,
    articleLinkSelector: '.a',
    titleSelector: '.t',
    contentSelector: '.c',
  }
}

function makeRun(overrides: Partial<CrawlRun> = {}): CrawlRun {
  return {
    id: RUN_ID,
    targetPressIds: [],
    startedAt: '2026-08-10T00:00:00+09:00',
    finishedAt: null,
    successCount: 0,
    failCount: 0,
    status: 'running',
    ...overrides,
  }
}

/** 실행 로직 자체를 정확히 흉내 낸다 — run-manager가 finishRun 반환값을 그대로 신뢰하기 때문이다. */
function finishRunLikeReal(runId: string, counts: { successCount: number; failCount: number }): CrawlRun {
  const status =
    counts.failCount === 0 ? 'done' : counts.successCount === 0 ? 'failed' : 'partial-failed'
  return makeRun({ id: runId, successCount: counts.successCount, failCount: counts.failCount, status })
}

function draft(pressId: string, seq: number): Omit<Article, 'id'> {
  return {
    pressId,
    runId: RUN_ID,
    title: `기사 ${seq}`,
    url: `https://example.com/${pressId}/${seq}`,
    content: '본문'.repeat(30),
    contentSource: 'rss-summary',
    crawledAt: '2026-08-10T00:00:00+09:00',
  }
}

beforeEach(() => {
  getPressMock.mockReset()
  createRunMock.mockReset()
  finishRunMock.mockReset()
  saveArticleMock.mockReset()
  crawlPressMock.mockReset()
  createRunMock.mockImplementation(async (pressIds: string[]) => makeRun({ targetPressIds: pressIds }))
  finishRunMock.mockImplementation(async (runId: string, counts: { successCount: number; failCount: number }) =>
    finishRunLikeReal(runId, counts)
  )
})

describe('startRun', () => {
  it('크롤이 끝나기 전에 runId를 반환한다(요청과 크롤의 수명 분리)', async () => {
    const pressA = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(pressA)

    let releaseCrawl: (() => void) | undefined
    crawlPressMock.mockReturnValue(
      new Promise<PressCrawlResult>((resolve) => {
        releaseCrawl = () => resolve({ pressId: pressA.id, articles: [], failures: [] })
      })
    )

    const result = await startRun({ pressIds: [pressA.id] })

    expect(result.runId).toBe(RUN_ID)
    // crawlPress가 아직 응답하지 않았으므로 finishRun은 호출되지 않은 상태여야 한다.
    expect(finishRunMock).not.toHaveBeenCalled()

    // 배경 잡을 마저 끝내 둔다 — 그러지 않으면 다음 테스트의 mock 리셋과 경합해 불안정해진다.
    releaseCrawl?.()
    await vi.waitFor(() => {
      expect(getRunProgress(RUN_ID).status).not.toBe('running')
    })
  })

  it('모듈이 다시 평가돼도(next dev HMR 흉내) 레지스트리가 살아남는다', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    // 크롤이 끝나지 않은 채로 "재평가"가 일어나는 상황을 재현한다.
    crawlPressMock.mockReturnValue(new Promise<PressCrawlResult>(() => {}))

    const before = await import('./run-manager')
    const { runId } = await before.startRun({ pressIds: [press.id] })

    // HMR은 모듈을 다시 평가한다 — vi.resetModules로 모듈 캐시만 비운다. globalThis 자체는
    // 이 호출로 지워지지 않으므로, run-manager.ts의 `globalForRuns.__crawlRuns ??= new Map()`가
    // 새 Map을 만드는 대신 기존 Map을 그대로 재사용해야 한다(docs/CONVENTIONS.md §5).
    vi.resetModules()
    const after = await import('./run-manager')

    expect(after.getRunProgress(runId).runId).toBe(runId)
    expect(after.getRunProgress(runId).pressStatuses).toHaveLength(1)
  })

  it('여러 언론사의 기사에 실행 전체에서 유일한 4자리 순번을 매겨 저장한다', async () => {
    const pressA = makeRssPress('press-a', '언론사 A')
    const pressB = makeRssPress('press-b', '언론사 B')
    getPressMock.mockImplementation(async (id: string) => (id === pressA.id ? pressA : pressB))

    crawlPressMock.mockImplementation(
      async (press: RssPressSource, _runId: string, _options: unknown, hooks: PressCrawlHooks) => {
        const articles = [draft(press.id, 1), draft(press.id, 2)]
        hooks.onArticleDone?.(press.id, 1, 2)
        hooks.onArticleDone?.(press.id, 2, 2)
        return { pressId: press.id, articles, failures: [] } satisfies PressCrawlResult
      }
    )

    await startRun({ pressIds: [pressA.id, pressB.id] })

    await vi.waitFor(() => {
      expect(getRunProgress(RUN_ID).status).not.toBe('running')
    })

    const savedIds = (saveArticleMock.mock.calls as [string, Article][]).map(([, article]) => article.id)
    expect(savedIds).toHaveLength(4)
    // 순번은 4자리 제로패딩이고, 두 언론사가 같은 번호를 받는 중복이 없어야 한다.
    expect(new Set(savedIds).size).toBe(4)
    for (const id of savedIds) {
      expect(id).toMatch(/^\d{4}$/)
    }
  })

  it('진행 중 onArticleDone 호출이 getRunProgress에 즉시 반영된다', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)

    // 의도적으로 resolve하지 않는다 — 진행 중 스냅샷만 확인한다.
    let onDone: ((collected: number, target: number) => void) | undefined
    crawlPressMock.mockImplementation(
      (press2: RssPressSource, _runId: string, _options: unknown, hooks: PressCrawlHooks) => {
        onDone = (collected, target) => hooks.onArticleDone?.(press2.id, collected, target)
        return new Promise<PressCrawlResult>(() => {})
      }
    )

    await startRun({ pressIds: [press.id] })
    onDone?.(5, 20)

    const progress = getRunProgress(RUN_ID)
    expect(progress.currentPressName).toBe('언론사 A')
    expect(progress.currentCollected).toBe(5)
    expect(progress.currentTarget).toBe(20)
    expect(progress.pressStatuses[0]).toMatchObject({ status: 'running', collected: 5, target: 20 })
  })

  it('선택 시점 이후 사라진 언론사 id는 크롤을 시도하지 않고 바로 실패로 기록한다', async () => {
    getPressMock.mockResolvedValue(null)

    await startRun({ pressIds: ['ghost-press'] })

    await vi.waitFor(() => {
      expect(getRunProgress(RUN_ID).status).not.toBe('running')
    })

    expect(crawlPressMock).not.toHaveBeenCalled()
    expect(getRunProgress(RUN_ID).pressStatuses[0]).toMatchObject({
      pressId: 'ghost-press',
      status: 'failed',
    })
    expect(finishRunMock).toHaveBeenCalledWith(RUN_ID, { successCount: 0, failCount: 1 })
  })
})

describe('getRunProgress / abortRun', () => {
  it('등록되지 않은 runId는 예외로 알린다', () => {
    expect(() => getRunProgress('없는-run')).toThrow()
    expect(() => abortRun('없는-run')).toThrow()
  })
})

// 6일차 화면 워크스트림 리뷰 지적: 화면 설계서 01 §상태별 화면 ⑤는 failReason이 두 단어
// 정형 라벨(HTML: 타임아웃/셀렉터 불일치, RSS: 피드 파싱 실패/피드 응답 없음)이길 기대하는데
// press-crawler·fetchHtml·fetchFeed가 실제로 던지는 원문은 그 문구와 다르다. run-manager가
// 저장 시점에 다듬는지 여기서 회귀로 잡는다.
describe('failReason 정형화(normalizeFailReason)', () => {
  it.each([
    ['목록 페이지에서 기사 링크를 찾지 못했습니다(셀렉터를 확인하세요)', '셀렉터 불일치'],
    ['page.goto: Timeout 30000ms exceeded.', '타임아웃'],
    ['net::ERR_NAME_NOT_RESOLVED', '타임아웃'],
  ])('HTML 언론사 전체 실패 "%s" → "%s"', async (rawError, expectedLabel) => {
    const press = makeHtmlPress('press-html', '언론사 HTML')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({
      pressId: press.id,
      articles: [],
      failures: [{ ok: false, url: press.listUrl, error: rawError, elapsedMs: 0 }],
    } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(() => {
      expect(getRunProgress(RUN_ID).status).not.toBe('running')
    })

    expect(getRunProgress(RUN_ID).pressStatuses[0]).toMatchObject({
      status: 'failed',
      failReason: expectedLabel,
      rawFailReason: rawError,
    })
  })

  it.each([
    ['RSS 2.0 또는 Atom 피드 형식이 아닙니다', '피드 파싱 실패'],
    ['RSS/Atom XML을 해석할 수 없습니다', '피드 파싱 실패'],
    ['피드 요청이 시간 초과되었습니다', '피드 응답 없음'],
    ['피드 응답이 실패했습니다 (status: 404)', '피드 응답 없음'],
  ])('RSS 언론사 전체 실패 "%s" → "%s"', async (rawError, expectedLabel) => {
    const press = makeRssPress('press-rss', '언론사 RSS')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({
      pressId: press.id,
      articles: [],
      failures: [{ ok: false, url: press.feedUrl, error: rawError, elapsedMs: 0 }],
    } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(() => {
      expect(getRunProgress(RUN_ID).status).not.toBe('running')
    })

    expect(getRunProgress(RUN_ID).pressStatuses[0]).toMatchObject({
      status: 'failed',
      failReason: expectedLabel,
      rawFailReason: rawError,
    })
  })
})
