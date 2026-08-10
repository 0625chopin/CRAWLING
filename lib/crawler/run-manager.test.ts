import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RunNotFoundError } from '@/lib/storage/run-repository'
import type { Article } from '@/lib/types/article'
import type { CrawlRun, PressRunResult } from '@/lib/types/crawl-run'
import type { HtmlPressSource, RssPressSource } from '@/lib/types/press'

import type { PressCrawlHooks, PressCrawlResult } from './press-crawler'
import { abortRun, getRunProgress, RunAlreadyRunningError, RunNotAbortableError, startRun } from './run-manager'

/**
 * run-manager는 저장소(fs 경유)와 press-crawler(Playwright·네트워크)를 직접 부르므로
 * 순수 로직(전역 순번 배정·진행 상태 갱신·집계·중단·복구)만 태우려면 세 계층을 전부 스텁으로
 * 바꾼다(lib/crawler/press-crawler.test.ts와 같은 패턴). vi.mock은 파일 상단으로 끌어올려지므로
 * import 아래 적어도 적용된다.
 *
 * 실제 fs 쓰기·HMR 생존·1초 이내 응답·진짜 서버 재시작 같은 실측 항목은 이 스위트가 아니라
 * 회차 보고서에 따로 남긴다(docs/CONVENTIONS.md §9 — vitest는 순수 함수 전용).
 */

const getPressMock = vi.fn()
vi.mock('@/lib/storage/press-repository', () => ({
  getPress: (...args: unknown[]) => getPressMock(...args),
}))

const createRunMock = vi.fn()
const finishRunMock = vi.fn()
const getRunMock = vi.fn()
const updateRunMetaMock = vi.fn()
// RunNotFoundError는 실제 클래스를 그대로 가져온다(importOriginal) — getRunMock이 이 타입의
// 인스턴스로 reject해야 getRunProgress/abortRun이 문자열이 아니라 타입으로 판정하는지 확인할 수
// 있다(8일차 교차검증 후속: "문구를 다듬는 순간 조용히 500이 된다"는 지적).
vi.mock('@/lib/storage/run-repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage/run-repository')>()
  return {
    RunNotFoundError: actual.RunNotFoundError,
    createRun: (...args: unknown[]) => createRunMock(...args),
    finishRun: (...args: unknown[]) => finishRunMock(...args),
    getRun: (...args: unknown[]) => getRunMock(...args),
    updateRunMeta: (...args: unknown[]) => updateRunMetaMock(...args),
  }
})

const saveArticleMock = vi.fn()
const listArticlesMock = vi.fn()
vi.mock('@/lib/storage/article-repository', () => ({
  saveArticle: (...args: unknown[]) => saveArticleMock(...args),
  listArticles: (...args: unknown[]) => listArticlesMock(...args),
}))

const crawlPressMock = vi.fn()
vi.mock('./press-crawler', () => ({
  crawlPress: (...args: unknown[]) => crawlPressMock(...args),
}))

// vi.mock 팩토리는 파일 상단으로 끌어올려지므로 외부 변수를 참조하려면 vi.hoisted로 감싸야 한다.
// pressConcurrency를 테스트별로 바꿔야(1로 좁혀 "다음 언론사"를 확정적으로 붙잡는다) 하는 테스트가
// 있어 config를 통째로 다시 만드는 대신 같은 객체를 mutate한다.
const configMock = vi.hoisted(() => ({
  concurrency: 2,
  delayMs: 0,
  timeoutMs: 5000,
  channel: undefined,
  headless: true,
  userAgent: 'vitest',
  // 두 언론사를 동시에 굴려도 순번 배정이 겹치지 않는지 확인하려고 기본은 넉넉히 둔다.
  pressConcurrency: 5,
}))
vi.mock('./config', () => ({ crawlerConfig: configMock }))

const RUN_ID = '20260810-090000'

// category는 이 스위트의 시나리오와 무관하지만 Press.category가 필수 출력 필드라 값을 채워야
// 한다(21일차 저장소 계층 Task 026 — docs/ISSUES.draft.저장소계층.md, I-050과 같은 형태의 함정).
function makeRssPress(id: string, name: string): RssPressSource {
  return {
    id,
    name,
    isActive: true,
    category: 'it-ai',
    sourceType: 'rss',
    feedUrl: `https://example.com/${id}.xml`,
  }
}

function makeHtmlPress(id: string, name: string): HtmlPressSource {
  return {
    id,
    name,
    isActive: true,
    category: 'it-ai',
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
    skippedCount: 0,
    // z.infer 출력 타입은 .default(...)가 있어도 필수 필드다(skippedCount와 같은 패턴) —
    // 앞 구간(저장소 계층)이 crawlRunSchema에 pressResults를 추가하면서 이 리터럴이 한 번 깨졌고
    // (I-050), failedPressCount(I-040)·targetCategories(Task 027)도 같은 이유로 여기 명시해야 한다.
    pressResults: [],
    failedPressCount: 0,
    targetCategories: [],
    status: 'running',
    ...overrides,
  }
}

/** 실행 로직 자체를 정확히 흉내 낸다 — run-manager가 finishRun 반환값을 그대로 신뢰하기 때문이다. */
function finishRunLikeReal(
  runId: string,
  counts: { successCount: number; failCount: number; skippedCount?: number },
  pressResults: CrawlRun['pressResults'] = []
): CrawlRun {
  // skippedCount는 status 계산에 넣지 않는다(I-017) — 실제 finishRun과 같은 규칙이다.
  const status =
    counts.failCount === 0 ? 'done' : counts.successCount === 0 ? 'failed' : 'partial-failed'
  return makeRun({
    id: runId,
    successCount: counts.successCount,
    failCount: counts.failCount,
    skippedCount: counts.skippedCount ?? 0,
    pressResults,
    status,
  })
}

/** updateRunMeta 실제 동작(현재값 + patch 병합)을 흉내 낸다 — 마무리 단계 검증에 필요하다. */
function updateRunMetaLikeReal(current: CrawlRun, patch: Partial<Omit<CrawlRun, 'id'>>): CrawlRun {
  return { ...current, ...patch, id: current.id }
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
  getRunMock.mockReset()
  updateRunMetaMock.mockReset()
  saveArticleMock.mockReset()
  listArticlesMock.mockReset()
  crawlPressMock.mockReset()
  configMock.pressConcurrency = 5
  createRunMock.mockImplementation(
    async (pressIds: string[], targetCategories: CrawlRun['targetCategories'] = []) =>
      makeRun({ targetPressIds: pressIds, targetCategories })
  )
  finishRunMock.mockImplementation(
    async (
      runId: string,
      counts: { successCount: number; failCount: number; skippedCount?: number },
      pressResults: CrawlRun['pressResults']
    ) => finishRunLikeReal(runId, counts, pressResults)
  )
})

describe('startRun', () => {
  it('크롤이 끝나기 전에 runId를 반환한다(요청과 크롤의 수명 분리)', async () => {
    const pressA = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(pressA)

    let releaseCrawl: (() => void) | undefined
    crawlPressMock.mockReturnValue(
      new Promise<PressCrawlResult>((resolve) => {
        releaseCrawl = () => resolve({ pressId: pressA.id, articles: [], failures: [], skipped: [] })
      })
    )

    const result = await startRun({ pressIds: [pressA.id] })

    expect(result.runId).toBe(RUN_ID)
    // crawlPress가 아직 응답하지 않았으므로 finishRun은 호출되지 않은 상태여야 한다.
    expect(finishRunMock).not.toHaveBeenCalled()

    // 배경 잡을 마저 끝내 둔다 — 그러지 않으면 다음 테스트의 mock 리셋과 경합해 불안정해진다.
    releaseCrawl?.()
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
  })

  it('모듈이 다시 평가돼도(next dev HMR 흉내) 레지스트리가 살아남는다', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    // 크롤이 끝나지 않은 채로 "재평가"가 일어나는 상황을 재현한다.
    let releaseCrawl: (() => void) | undefined
    crawlPressMock.mockReturnValue(
      new Promise<PressCrawlResult>((resolve) => {
        releaseCrawl = () => resolve({ pressId: press.id, articles: [], failures: [], skipped: [] })
      })
    )

    const before = await import('./run-manager')
    const { runId } = await before.startRun({ pressIds: [press.id] })

    // HMR은 모듈을 다시 평가한다 — vi.resetModules로 모듈 캐시만 비운다. globalThis 자체는
    // 이 호출로 지워지지 않으므로, run-manager.ts의 `globalForRuns.__crawlRuns ??= new Map()`가
    // 새 Map을 만드는 대신 기존 Map을 그대로 재사용해야 한다(docs/CONVENTIONS.md §5).
    vi.resetModules()
    const after = await import('./run-manager')

    const progress = await after.getRunProgress(runId)
    expect(progress.runId).toBe(runId)
    expect(progress.pressStatuses).toHaveLength(1)

    // 배경 잡을 마저 끝내 둔다 — 그러지 않으면 레지스트리에 running 잡이 남아 "이미 running인
    // 잡이 있으면 거절한다" 판정이 다음 테스트와 경합한다.
    releaseCrawl?.()
    await vi.waitFor(async () => {
      expect((await after.getRunProgress(runId)).status).not.toBe('running')
    })
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
        return { pressId: press.id, articles, failures: [], skipped: [] } satisfies PressCrawlResult
      }
    )

    await startRun({ pressIds: [pressA.id, pressB.id] })

    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
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

    // resolve를 뒤로 미뤄 진행 중 스냅샷을 먼저 확인한다.
    let onDone: ((collected: number, target: number) => void) | undefined
    let resolveCrawl: ((result: PressCrawlResult) => void) | undefined
    crawlPressMock.mockImplementation(
      (press2: RssPressSource, _runId: string, _options: unknown, hooks: PressCrawlHooks) => {
        onDone = (collected, target) => hooks.onArticleDone?.(press2.id, collected, target)
        return new Promise<PressCrawlResult>((resolve) => {
          resolveCrawl = resolve
        })
      }
    )

    await startRun({ pressIds: [press.id] })
    onDone?.(5, 20)

    const progress = await getRunProgress(RUN_ID)
    expect(progress.currentPressName).toBe('언론사 A')
    expect(progress.currentCollected).toBe(5)
    expect(progress.currentTarget).toBe(20)
    expect(progress.pressStatuses[0]).toMatchObject({ status: 'running', collected: 5, target: 20 })
    // 레지스트리 적중 경로(정상 경로)에서는 복구 플래그를 붙이지 않는다(8일차 교차검증 후속).
    expect(progress.recovered).toBeUndefined()

    // 다음 테스트가 같은 RUN_ID로 startRun을 다시 호출할 수 있도록 배경 잡을 마저 끝내 둔다.
    resolveCrawl?.({ pressId: press.id, articles: [], failures: [], skipped: [] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
  })

  it('선택 시점 이후 사라진 언론사 id는 크롤을 시도하지 않고 바로 실패로 기록한다', async () => {
    getPressMock.mockResolvedValue(null)

    await startRun({ pressIds: ['ghost-press'] })

    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    expect(crawlPressMock).not.toHaveBeenCalled()
    expect((await getRunProgress(RUN_ID)).pressStatuses[0]).toMatchObject({
      pressId: 'ghost-press',
      status: 'failed',
    })
    expect(finishRunMock).toHaveBeenCalledWith(
      RUN_ID,
      {
        successCount: 0,
        failCount: 1,
        // 언론사 자체가 실패로 확정된 경우다 — 기사 단위와 언론사 단위가 둘 다 1이다(I-040).
        failedPressCount: 1,
        skippedCount: 0,
      },
      // getPress가 null인 언론사는 startRun이 이미 채워 둔 'failed' 상태 그대로 pressResults에
      // 실린다(I-022) — runOnePress를 거치지 않으므로 여기서 새로 만들어지지 않는다.
      [
        {
          pressId: 'ghost-press',
          name: 'ghost-press',
          status: 'failed',
          collected: 0,
          target: 0,
          failReason: '존재하지 않는 언론사입니다',
        },
      ]
    )
  })

  // Task 027 회귀: targetCategories는 언론사 선택과 무관한 스냅샷이라 createRun에 그대로 실려야
  // 한다 — app/api/crawl/route.ts가 categories를 이미 pressIds로 풀어 넘긴다는 계약이므로, 여기서는
  // "그때 요청한 카테고리가 무엇이었는지"만 전달되는지 확인한다.
  it('categories를 넘기면 createRun에 targetCategories로 그대로 전달된다(Task 027)', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({ pressId: press.id, articles: [], failures: [], skipped: [] } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id], categories: ['sports', 'economy'] })

    expect(createRunMock).toHaveBeenCalledWith([press.id], ['sports', 'economy'])
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
  })

  it('categories를 넘기지 않으면 createRun에 빈 배열이 전달된다(기존 pressIds 경로)', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({ pressId: press.id, articles: [], failures: [], skipped: [] } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })

    expect(createRunMock).toHaveBeenCalledWith([press.id], [])
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
  })

  it('이미 running인 잡이 있으면 새 실행을 RunAlreadyRunningError로 거절한다(409로 내려갈 신호)', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)

    let releaseCrawl: (() => void) | undefined
    crawlPressMock.mockReturnValue(
      new Promise<PressCrawlResult>((resolve) => {
        releaseCrawl = () => resolve({ pressId: press.id, articles: [], failures: [], skipped: [] })
      })
    )

    await startRun({ pressIds: [press.id] })

    // toThrow(SomeClass)는 그 클래스가 사라지면 조용히 완화된다(I-046) — toBeInstanceOf로 못박는다.
    await expect(startRun({ pressIds: [press.id] })).rejects.toBeInstanceOf(RunAlreadyRunningError)
    // createRun이 두 번째 시도에서 다시 호출되지 않아야 한다 — 거절이 저장소를 건드리기 전에 일어난다.
    expect(createRunMock).toHaveBeenCalledTimes(1)

    releaseCrawl?.()
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
  })
})

describe('abortRun — 진행 중인 잡', () => {
  it('플래그를 세우면 아직 시작하지 않은 다음 언론사는 건너뛰고, 이미 시작한 언론사는 끝까지 기다린 뒤 run을 aborted로 마무리한다', async () => {
    // pLimit(1)로 언론사를 한 번에 하나씩만 진행시켜 "다음 언론사"를 확정적으로 붙잡는다.
    configMock.pressConcurrency = 1

    const pressA = makeRssPress('press-a', '언론사 A')
    const pressB = makeRssPress('press-b', '언론사 B')
    getPressMock.mockImplementation(async (id: string) => (id === pressA.id ? pressA : pressB))

    let releaseA: (() => void) | undefined
    crawlPressMock.mockImplementation(async (press: RssPressSource) => {
      if (press.id === pressA.id) {
        await new Promise<void>((resolve) => {
          releaseA = resolve
        })
        return { pressId: press.id, articles: [draft(press.id, 1)], failures: [], skipped: [] } satisfies PressCrawlResult
      }
      // press B는 중단 이후 시작되면 안 된다 — 호출 자체를 실패로 만든다.
      throw new Error('press B는 호출되면 안 된다(abortRun 이후)')
    })

    let updateRunMetaCurrent: CrawlRun | undefined
    updateRunMetaMock.mockImplementation(async (runId: string, patch: Partial<Omit<CrawlRun, 'id'>>) => {
      updateRunMetaCurrent = updateRunMetaLikeReal(
        updateRunMetaCurrent ?? finishRunLikeReal(runId, { successCount: 0, failCount: 0 }),
        patch
      )
      return updateRunMetaCurrent
    })

    await startRun({ pressIds: [pressA.id, pressB.id] })

    // press A가 진행 중인 도중 중단을 요청한다.
    await vi.waitFor(() => expect(crawlPressMock).toHaveBeenCalledTimes(1))
    await abortRun(RUN_ID)
    releaseA?.()

    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).toBe('aborted')
    })

    // press B의 차례가 왔을 때 이미 aborted라 crawlPress 자체를 시도하지 않는다.
    expect(crawlPressMock).toHaveBeenCalledTimes(1)
    const progress = await getRunProgress(RUN_ID)
    expect(progress.pressStatuses.find((p) => p.pressId === pressB.id)).toMatchObject({ status: 'waiting' })
    expect(progress.pressStatuses.find((p) => p.pressId === pressA.id)).toMatchObject({ status: 'done' })
    // press A가 중단 전에 모은 기사는 그대로 저장된다.
    expect(saveArticleMock).toHaveBeenCalledTimes(1)
    expect(updateRunMetaMock).toHaveBeenCalledWith(RUN_ID, { status: 'aborted' })
  })

  // I-017 회귀. 9일차 실크롤에서 중단 결과가 `successCount: 51, failCount: 43`으로 남았는데 43은
  // 요청조차 하지 않은 링크였다 — 화면(016B)이 그대로 그리면 중단 버튼을 눌렀을 뿐인데
  // "실패 43건" destructive Alert가 뜬다. 이 경계를 코드로 못박아 둔다.
  it('중단으로 건너뛴 기사는 failCount가 아니라 skippedCount로 집계한다(I-017)', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({
      pressId: press.id,
      articles: [draft(press.id, 1), draft(press.id, 2)],
      failures: [{ ok: false, url: 'https://example.com/press-a/9', error: '타임아웃', elapsedMs: 0 }],
      skipped: ['https://example.com/press-a/3', 'https://example.com/press-a/4'],
    } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    // 실제로 시도했다가 실패한 1건만 failCount다. 건너뛴 2건은 별도 칸으로 간다.
    expect(finishRunMock).toHaveBeenCalledWith(
      RUN_ID,
      {
        successCount: 2,
        failCount: 1,
        // **I-040의 핵심 케이스다**: 기사 1건이 실패했지만 언론사는 2건을 건져 'done'이다. 두 숫자의
        // 단위가 다르다는 사실이 여기서 그대로 드러난다 — 화면은 이 0을 보고 "언론사가 실패했다"는
        // 말을 쓰지 않는다.
        failedPressCount: 0,
        skippedCount: 2,
      },
      // 언론사 자체는 기사를 2건 건졌으므로 isTotalFailure가 아니다 — 'done'으로 pressResults에
      // 실린다(개별 기사 실패는 언론사 단위 상태와 별개, I-040).
      [{ pressId: 'press-a', name: '언론사 A', status: 'done', collected: 0, target: 20 }]
    )
  })

  it('이미 종료된 잡을 다시 중단하면 예외를 던진다', async () => {
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockResolvedValue({ pressId: press.id, articles: [], failures: [], skipped: [] } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    await expect(abortRun(RUN_ID)).rejects.toBeInstanceOf(RunNotAbortableError)
  })
})

describe('getRunProgress / abortRun — 존재하지 않는 runId', () => {
  it('레지스트리에도 디스크에도 없는 runId는 RunNotFoundError로 알린다', async () => {
    getRunMock.mockRejectedValue(new RunNotFoundError('없는-run'))

    await expect(getRunProgress('없는-run')).rejects.toBeInstanceOf(RunNotFoundError)
    await expect(abortRun('없는-run')).rejects.toBeInstanceOf(RunNotFoundError)
  })
})

// Task 014B DoD ⑤: 서버 재시작으로 globalThis 레지스트리가 비어도(이 프로세스가 그 run을 잡으로
// 들고 있어 본 적이 없어도) run-meta.json이 'running'인 채로 남은 run은 조회 시점에 'aborted'로
// 간주하고 그 사실을 파일에도 남긴다.
describe('getRunProgress — 레지스트리에 없는 run의 복구(서버 재시작 흉내)', () => {
  it('디스크에서 running인 run은 aborted로 갱신하고 그 상태를 돌려준다', async () => {
    const ORPHAN_ID = '20260809-235900'
    getRunMock.mockResolvedValue(
      makeRun({ id: ORPHAN_ID, status: 'running', targetPressIds: ['press-a'], finishedAt: null })
    )
    updateRunMetaMock.mockImplementation(async (runId: string, patch: Partial<Omit<CrawlRun, 'id'>>) =>
      makeRun({ id: runId, status: 'running', targetPressIds: ['press-a'], ...patch })
    )
    listArticlesMock.mockResolvedValue([
      {
        id: '0001',
        pressId: 'press-a',
        runId: ORPHAN_ID,
        title: '기사',
        url: 'https://example.com/1',
        contentSource: 'rss-summary',
        crawledAt: '2026-08-09T23:59:30+09:00',
      },
    ])
    getPressMock.mockResolvedValue(makeRssPress('press-a', '언론사 A'))

    const progress = await getRunProgress(ORPHAN_ID)

    expect(progress.status).toBe('aborted')
    expect(updateRunMetaMock).toHaveBeenCalledWith(
      ORPHAN_ID,
      expect.objectContaining({ status: 'aborted' })
    )
    // 언론사별 상세는 메모리에 없던 값이라 실제 저장된 기사 수로만 재구성한다 — 근거 없는
    // failReason을 지어내지 않고, 기사를 하나라도 건졌으면 'done'으로 본다.
    expect(progress.pressStatuses[0]).toMatchObject({
      pressId: 'press-a',
      name: '언론사 A',
      status: 'done',
      collected: 1,
    })
    // target이 실제 목표치가 아니라 collected와 같은 근사값이므로(위 어서션의 target: 1이 원래
    // 목표였는지는 알 수 없다), 화면이 "확정 완료"로 오인하지 않도록 이 플래그가 서야 한다
    // (8일차 교차검증 후속 — "5/5건 완료"로 잘못 보이는 문제).
    expect(progress.recovered).toBe(true)
  })

  it('디스크에서 이미 끝난(running이 아닌) run은 수정 없이 그 상태를 그대로 돌려준다', async () => {
    const DONE_ID = '20260809-120000'
    getRunMock.mockResolvedValue(
      makeRun({ id: DONE_ID, status: 'done', targetPressIds: [], finishedAt: '2026-08-09T12:10:00+09:00' })
    )
    listArticlesMock.mockResolvedValue([])

    const progress = await getRunProgress(DONE_ID)

    expect(progress.status).toBe('done')
    expect(updateRunMetaMock).not.toHaveBeenCalled()
    // 이미 끝난 run을 다시 읽는 경로도 target을 collected로 근사하므로 마찬가지로 플래그를 세운다.
    expect(progress.recovered).toBe(true)
  })

  // I-022 해소 회귀: finishRun이 이미 언론사별 최종 결과를 남긴 run은 근사하지 않는다.
  it('디스크에 pressResults가 남아 있으면 근사하지 않고 그대로 쓰고 recovered를 세우지 않는다', async () => {
    const FINISHED_ID = '20260809-180000'
    const storedPressResults: PressRunResult[] = [
      { pressId: 'press-a', name: '언론사 A', status: 'done', collected: 20, target: 20 },
      {
        pressId: 'press-b',
        name: '언론사 B',
        status: 'failed',
        collected: 0,
        target: 0,
        failReason: '타임아웃',
        rawFailReason: 'page.goto: Timeout 30000ms exceeded.',
      },
    ]
    getRunMock.mockResolvedValue(
      makeRun({
        id: FINISHED_ID,
        status: 'partial-failed',
        targetPressIds: ['press-a', 'press-b'],
        finishedAt: '2026-08-09T18:05:00+09:00',
        successCount: 20,
        failCount: 1,
        pressResults: storedPressResults,
      })
    )

    const progress = await getRunProgress(FINISHED_ID)

    expect(progress.status).toBe('partial-failed')
    // target이 실제 목표치 그대로다(근사 폴백처럼 collected로 강제되지 않는다).
    expect(progress.pressStatuses).toEqual(storedPressResults)
    // 정확한 값이므로 "근사치" 플래그를 세우지 않는다 — 세우면 016B가 정확한 상세를 받고도
    // 런 레벨 안내 한 줄로 뭉갠다.
    expect(progress.recovered).toBeUndefined()
    // 이미 정확한 값이 있으므로 근사 복원 경로(listArticles로 기사 세기)를 타지 않는다.
    expect(listArticlesMock).not.toHaveBeenCalled()
    // 언론사 단위 실패 수는 파일의 failedPressCount가 아니라 pressResults에서 다시 센다(I-040) —
    // 이 필드가 생기기 전에 끝난 run은 파일 값이 0이지만 pressResults에는 실패가 들어 있다.
    // 화면이 보는 목록(1곳 실패)과 숫자가 어긋나지 않는 쪽을 고른 것이다.
    expect(progress.failedPressCount).toBe(1)
  })

  /**
   * I-040 회귀 방어. 근사 복원 경로는 저장된 기사 개수로 언론사 상태를 되짚기 때문에 **실패한
   * 언론사가 'waiting'으로 보인다.** 여기서 언론사 단위 실패 수를 0으로 채우면 화면이 "언론사는
   * 모두 정상 처리됐다"고 단정하는데, 그게 I-040이 만들던 거짓말이다 — 모르는 것은 undefined다.
   */
  it('근사 복원 경로는 언론사 단위 실패 수를 0이 아니라 undefined로 남긴다(I-040)', async () => {
    const LEGACY_ID = '20260809-100000'
    getRunMock.mockResolvedValue(
      makeRun({
        id: LEGACY_ID,
        status: 'partial-failed',
        targetPressIds: ['press-a'],
        finishedAt: '2026-08-09T10:05:00+09:00',
        successCount: 3,
        failCount: 2,
        // 이 필드들이 생기기 전에 끝난 run이다 — 언론사별 상세가 파일에 없다.
        pressResults: [],
        failedPressCount: 0,
      })
    )
    listArticlesMock.mockResolvedValue([])
    getPressMock.mockResolvedValue(makeRssPress('press-a', '언론사 A'))

    const progress = await getRunProgress(LEGACY_ID)

    expect(progress.recovered).toBe(true)
    // 파일에 0이 있어도 그대로 옮기지 않는다. 0("실패한 언론사 없음")과 undefined("알 수 없음")는
    // 화면에서 서로 다른 문구로 갈린다.
    expect(progress.failedPressCount).toBeUndefined()
    // 기사 단위 실패 수는 파일에 정확히 남아 있으므로 그대로 쓴다 — 못 쓰는 건 언론사 단위뿐이다.
    expect(progress.failCount).toBe(2)
  })
})

describe('abortRun — 레지스트리에 없는 run의 복구(서버 재시작 흉내)', () => {
  it('디스크에서 running인 run은 직접 aborted로 마무리한다', async () => {
    const ORPHAN_ID = '20260809-235900'
    getRunMock.mockResolvedValue(makeRun({ id: ORPHAN_ID, status: 'running' }))
    updateRunMetaMock.mockResolvedValue(makeRun({ id: ORPHAN_ID, status: 'aborted' }))

    await abortRun(ORPHAN_ID)

    expect(updateRunMetaMock).toHaveBeenCalledWith(
      ORPHAN_ID,
      expect.objectContaining({ status: 'aborted' })
    )
  })

  it('디스크에서 이미 끝난 run은 중단할 수 없다고 RunNotAbortableError를 던진다', async () => {
    const DONE_ID = '20260809-120000'
    getRunMock.mockResolvedValue(makeRun({ id: DONE_ID, status: 'done' }))

    await expect(abortRun(DONE_ID)).rejects.toBeInstanceOf(RunNotAbortableError)
    expect(updateRunMetaMock).not.toHaveBeenCalled()
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
      skipped: [],
    } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    expect((await getRunProgress(RUN_ID)).pressStatuses[0]).toMatchObject({
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
      skipped: [],
    } satisfies PressCrawlResult)

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    expect((await getRunProgress(RUN_ID)).pressStatuses[0]).toMatchObject({
      status: 'failed',
      failReason: expectedLabel,
      rawFailReason: rawError,
    })
  })
})

/**
 * I-051 회귀 방어. 이 경로는 "화면이 멈춘다"로 끝나지 않고 **새 크롤을 영영 시작할 수 없게**
 * 만드는 자물쇠라, 수동 확인으로는 잡히지 않는다(로컬에서 Playwright 기동이 늘 성공해 왔다).
 */
describe('runInBackground이 값이 아니라 예외로 끝나는 경우(I-051)', () => {
  it('예외가 새어도 finishRun이 불리고 run이 running에 갇히지 않는다', async () => {
    // 원인은 서버 콘솔에만 남긴다(CONVENTIONS §7) — 테스트 출력까지 더럽히지 않게 막는다.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    // fetchHtml의 브라우저 기동 실패처럼 crawlPress가 CrawlResult 값이 아니라 예외로 죽는 상황.
    crawlPressMock.mockRejectedValue(new Error('browserType.launch: Executable was not found'))

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    expect(finishRunMock).toHaveBeenCalled()
    // 아직 결말이 없던 언론사는 성공으로 올리지 않고 실패로 확정한다.
    expect((await getRunProgress(RUN_ID)).pressStatuses[0]).toMatchObject({
      status: 'failed',
      failReason: '실행이 예기치 않게 중단되었습니다',
    })
    consoleError.mockRestore()
  })

  it('예외로 끝난 뒤에도 새 실행을 시작할 수 있다(레지스트리가 running으로 잠기지 않는다)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const press = makeRssPress('press-a', '언론사 A')
    getPressMock.mockResolvedValue(press)
    crawlPressMock.mockRejectedValue(new Error('browserType.launch: Executable was not found'))

    await startRun({ pressIds: [press.id] })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })

    // 고치기 전에는 여기서 RunAlreadyRunningError가 났다 — 서버를 재시작해야만 풀렸다.
    crawlPressMock.mockResolvedValue({
      pressId: press.id,
      articles: [],
      failures: [],
      skipped: [],
    } satisfies PressCrawlResult)
    await expect(startRun({ pressIds: [press.id] })).resolves.toMatchObject({ runId: RUN_ID })
    await vi.waitFor(async () => {
      expect((await getRunProgress(RUN_ID)).status).not.toBe('running')
    })
    consoleError.mockRestore()
  })
})
