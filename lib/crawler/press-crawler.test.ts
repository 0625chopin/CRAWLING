import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HtmlPressSource, RssPressSource } from '@/lib/types/press'

import { crawlPress } from './press-crawler'
import type { FeedItem } from './rss'

/**
 * press-crawler는 fetchHtml(Playwright)·fetchFeed(네트워크)를 직접 부르므로 순수 로직만 태우려면
 * 두 모듈을 통째로 스텁으로 바꾼다(lib/storage/press-repository.test.ts의 vi.mock('./paths') 패턴과 동일).
 * vi.mock 호출은 vitest가 파일 상단으로 끌어올리므로 import 아래 적어도 적용된다.
 * concurrency·delayMs도 실제 config 기본값(동시성 2·지연 500ms)을 쓰면 테스트가 느려지므로
 * 결정적이고 빠른 값으로 고정한다 — 실제 config 값 자체는 이 모듈이 아니라 config.ts의 책임이다.
 *
 * 실네트워크·실브라우저를 태운 검증(HTML/RSS 요약만/RSS 본문 전문 실제 언론사 3곳, Playwright 미기동 확인)은
 * 이 스위트가 아니라 회차 보고서에 별도로 기록한다(docs/CONVENTIONS.md §9 — vitest는 순수 함수 전용).
 */

const fetchHtmlMock = vi.fn()
vi.mock('./fetch-html', () => ({ fetchHtml: (...args: unknown[]) => fetchHtmlMock(...args) }))

const fetchFeedMock = vi.fn()
vi.mock('./rss', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./rss')>()
  return { ...actual, fetchFeed: (...args: unknown[]) => fetchFeedMock(...args) }
})

vi.mock('./config', () => ({
  crawlerConfig: {
    concurrency: 5,
    delayMs: 0,
    timeoutMs: 5000,
    channel: undefined,
    headless: true,
    userAgent: 'vitest',
  },
}))

beforeEach(() => {
  fetchHtmlMock.mockReset()
  fetchFeedMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

const RUN_ID = '20260810-090000'

const rssPressSummaryOnly: RssPressSource = {
  id: 'bloter',
  name: '블로터',
  isActive: true,
  sourceType: 'rss',
  feedUrl: 'https://example.com/feed.xml',
}

const rssPressFullText: RssPressSource = {
  id: 'inews24',
  name: '아이뉴스24',
  isActive: true,
  sourceType: 'rss',
  feedUrl: 'https://example.com/feed.xml',
  contentSelector: '#articleBody > p',
}

const htmlPress: HtmlPressSource = {
  id: 'zdnet-korea',
  name: 'ZDNet 코리아',
  isActive: true,
  sourceType: 'html',
  listUrl: 'https://example.com/news',
  articleLinkSelector: '.newsPost .assetText > a',
  titleSelector: '.news_head h1',
  contentSelector: '#articleBody',
}

function feedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: '제목',
    link: 'https://example.com/a/1',
    summary: '가'.repeat(300),
    publishedAt: undefined,
    ...overrides,
  }
}

function htmlPage(html: string, url = 'https://example.com/article', elapsedMs = 10) {
  return { ok: true as const, url, finalUrl: url, status: 200, title: '', html, elapsedMs }
}

describe('crawlPress — RSS 요약만(contentSelector 없음)', () => {
  it('원문 페이지를 열지 않고(fetchHtml 미호출) 요약을 그대로 기사로 만든다', async () => {
    fetchFeedMock.mockResolvedValue({
      ok: true,
      url: rssPressSummaryOnly.feedUrl,
      elapsedMs: 10,
      items: [
        feedItem({ link: 'https://example.com/a/1', title: '기사1', summary: '가'.repeat(300) }),
        feedItem({ link: 'https://example.com/a/2', title: '기사2', summary: '가'.repeat(10) }), // 하한(50자) 미달
      ],
    })

    const onArticleDone = vi.fn()
    const result = await crawlPress(rssPressSummaryOnly, RUN_ID, {}, { onArticleDone })

    expect(fetchHtmlMock).not.toHaveBeenCalled()
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      pressId: 'bloter',
      runId: RUN_ID,
      title: '기사1',
      url: 'https://example.com/a/1',
      contentSource: 'rss-summary',
    })
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].error).toMatch(/50자/)
    expect(onArticleDone).toHaveBeenNthCalledWith(1, 'bloter', 1, 2)
    expect(onArticleDone).toHaveBeenNthCalledWith(2, 'bloter', 2, 2)
  })

  it('피드 자체가 실패하면(비XML 등) 예외 대신 0건·실패 사유를 반환한다', async () => {
    fetchFeedMock.mockResolvedValue({
      ok: false,
      url: rssPressSummaryOnly.feedUrl,
      error: 'RSS 2.0 또는 Atom 피드 형식이 아닙니다',
      elapsedMs: 5,
    })

    const result = await crawlPress(rssPressSummaryOnly, RUN_ID, {})

    expect(result.articles).toHaveLength(0)
    expect(result.failures).toEqual([
      { ok: false, url: rssPressSummaryOnly.feedUrl, error: 'RSS 2.0 또는 Atom 피드 형식이 아닙니다', elapsedMs: 5 },
    ])
  })
})

describe('crawlPress — RSS 본문 전문(contentSelector 있음)', () => {
  it('각 link의 원문 페이지를 열어 본문 전문을 수집하고, 제목은 피드가 준 값을 그대로 쓴다(titleSelector 없음)', async () => {
    fetchFeedMock.mockResolvedValue({
      ok: true,
      url: rssPressFullText.feedUrl,
      elapsedMs: 5,
      items: [
        feedItem({
          link: 'https://example.com/view/1',
          title: '삼성전자, HBM4 양산 돌입',
          summary: '요약은 짧다',
        }),
      ],
    })
    fetchHtmlMock.mockResolvedValue(
      htmlPage(
        `<html><body><div id="articleBody"><p>${'가'.repeat(60)}</p><p>${'나'.repeat(60)}</p></div></body></html>`,
        'https://example.com/view/1'
      )
    )

    const result = await crawlPress(rssPressFullText, RUN_ID, {})

    expect(result.articles).toHaveLength(1)
    const [article] = result.articles
    expect(article.contentSource).toBe('article-page')
    expect(article.title).toBe('삼성전자, HBM4 양산 돌입')
    // 문단 개행이 살아 있어야 한다 — selectText로 뭉갠 것이 아니라는 증거.
    expect(article.content).toContain('\n\n')
    expect(article.content.length).toBeGreaterThan('요약은 짧다'.length)
  })

  it('maxArticlesPerPress로 자른 개수만큼만 원문 페이지를 요청한다(초과 요청 없음)', async () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      feedItem({ link: `https://example.com/a/${i}`, title: `기사${i}` })
    )
    fetchFeedMock.mockResolvedValue({ ok: true, url: rssPressFullText.feedUrl, elapsedMs: 1, items })
    fetchHtmlMock.mockImplementation(async ({ url }: { url: string }) =>
      htmlPage(`<div id="articleBody"><p>${'가'.repeat(60)}</p></div>`, url)
    )

    await crawlPress(rssPressFullText, RUN_ID, { maxArticlesPerPress: 3 })

    expect(fetchHtmlMock).toHaveBeenCalledTimes(3)
  })

  it('기사 1건이 실패해도(타임아웃 등) 나머지는 계속 수집된다', async () => {
    fetchFeedMock.mockResolvedValue({
      ok: true,
      url: rssPressFullText.feedUrl,
      elapsedMs: 1,
      items: [
        feedItem({ link: 'https://example.com/a/1', title: '성공1' }),
        feedItem({ link: 'https://example.com/a/2', title: '실패' }),
        feedItem({ link: 'https://example.com/a/3', title: '성공2' }),
      ],
    })
    fetchHtmlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url === 'https://example.com/a/2') {
        return { ok: false as const, url, error: '타임아웃', elapsedMs: 30000 }
      }
      return htmlPage(`<div id="articleBody"><p>${'가'.repeat(60)}</p><p>${'나'.repeat(60)}</p></div>`, url)
    })

    const result = await crawlPress(rssPressFullText, RUN_ID, {})

    expect(result.articles).toHaveLength(2)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].error).toBe('타임아웃')
  })
})

describe('crawlPress — HTML(목록 페이지 → 링크 → 본문)', () => {
  it('목록에서 링크를 뽑아 각 기사의 제목(titleSelector)·본문(contentSelector)을 수집한다', async () => {
    fetchHtmlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url === htmlPress.listUrl) {
        return htmlPage(
          `<html><body>
            <div class="newsPost"><div class="assetText"><a href="/view/?no=1">기사1</a></div></div>
            <div class="newsPost"><div class="assetText"><a href="/view/?no=2">기사2</a></div></div>
          </body></html>`,
          htmlPress.listUrl
        )
      }
      return htmlPage(
        `<html><body>
          <div class="news_head"><h1>기사 제목(${url})</h1></div>
          <div id="articleBody"><p>${'다'.repeat(60)}</p><p>${'라'.repeat(60)}</p></div>
        </body></html>`,
        url
      )
    })

    const result = await crawlPress(htmlPress, RUN_ID, {})

    expect(result.articles).toHaveLength(2)
    expect(result.articles.every((a) => a.contentSource === 'article-page')).toBe(true)
    expect(result.articles.map((a) => a.url).sort()).toEqual([
      'https://example.com/view/?no=1',
      'https://example.com/view/?no=2',
    ])
    expect(result.articles[0].title).toMatch(/^기사 제목/)
  })

  it('목록 페이지 자체를 못 열면 예외 대신 0건·실패 사유를 반환한다', async () => {
    fetchHtmlMock.mockResolvedValue({ ok: false, url: htmlPress.listUrl, error: '타임아웃', elapsedMs: 30000 })

    const result = await crawlPress(htmlPress, RUN_ID, {})

    expect(result.articles).toHaveLength(0)
    expect(result.failures).toEqual([{ ok: false, url: htmlPress.listUrl, error: '타임아웃', elapsedMs: 30000 }])
  })

  it('셀렉터가 틀려 링크를 하나도 못 찾으면 예외 대신 0건·실패 사유를 반환한다', async () => {
    fetchHtmlMock.mockResolvedValue(htmlPage('<html><body><p>기사 없음</p></body></html>', htmlPress.listUrl))

    const result = await crawlPress(htmlPress, RUN_ID, {})

    expect(result.articles).toHaveLength(0)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].error).toMatch(/링크를 찾지 못했습니다/)
  })
})
