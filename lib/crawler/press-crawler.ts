import 'server-only'

import pLimit from 'p-limit'

import type { Article } from '@/lib/types/article'
import type { HtmlPressSource, PressSource, RssPressSource } from '@/lib/types/press'

import { checkArticleContent, extractArticleContent, resolveMaxArticlesPerPress } from './article-parser'
import { crawlerConfig } from './config'
import { fetchHtml } from './fetch-html'
import { extractLinks, loadDocument, selectText } from './parse'
import { fetchFeed, type FeedItem } from './rss'
import type { CrawlFailure } from './types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * press-crawler가 만드는 기사 초안. `id`는 한 실행(run) 전체에서 유일해야 하는 4자리 순번인데,
 * 이 모듈은 언론사 1곳만 보고 다른 언론사가 몇 건을 만들지 모르므로 순번을 매길 수 없다.
 * 저장 시점(014A가 saveArticle을 부를 때)에 순번을 부여한다.
 */
export type ArticleDraft = Omit<Article, 'id'>

export interface PressCrawlHooks {
  /**
   * 언론사 하나 안에서 기사 1건(성공·실패 모두)이 끝날 때마다 호출된다.
   * 이 모듈은 저장소·HTTP를 모른다 — 진행 상황을 밖으로 알리는 유일한 통로다.
   */
  onArticleDone?: (pressId: string, collected: number, target: number) => void
  /**
   * 원문 페이지를 요청하기 직전에 확인하는 훅. true를 반환하면 그 기사는 `fetchHtml`을 호출하지
   * 않고 `skipped`에 담는다 — 이미 이 훅이 false였을 때 시작된 요청(진행 중인 Playwright 페이지)은
   * 강제로 죽이지 않고 끝까지 기다린다("다음 기사부터 요청하지 않는다"). run-manager의 abortRun
   * 플래그를 이 지점에서 읽는다(Task 014B, docs/DECISIONS.md D-016 "크롤 루프가 그 값을 읽어
   * 실제로 멈추는 것은 014B로 넘긴다").
   *
   * ⚠️ 건너뛴 링크는 `failures`에 넣지 않고 `onArticleDone`도 부르지 않는다 — 요청조차 하지 않은
   * 것을 실패·수집 완료로 세면 화면과 `run-meta.json`이 서로 다른 말을 한다(I-017).
   */
  isAborted?: () => boolean
}

export interface PressCrawlOptions {
  /** 언론사당 최대 수집 기사 수. 미지정 시 기본값 20, 상한 100(resolveMaxArticlesPerPress). */
  maxArticlesPerPress?: number
}

export interface PressCrawlResult {
  pressId: string
  /** 수집에 성공한 기사. */
  articles: ArticleDraft[]
  /**
   * 개별 기사(피드 항목·링크) 수준에서 격리된 실패. 피드·목록 페이지 자체를 열지 못한
   * 언론사 전체 실패도 이 배열에 담긴 1건으로 표현한다(articles는 빈 배열이 된다).
   */
  failures: CrawlFailure[]
  /**
   * 중단 요청 때문에 **요청 자체를 하지 않은** 링크의 URL. 실패가 아니므로 `failures`와 섞지
   * 않는다 — 9일차에 실크롤을 중단했더니 요청조차 하지 않은 43건이 `failCount`로 집계돼
   * `run-meta.json`이 "실패 43건", 진행 상태는 "전부 완료"라고 말하는 모순이 났다(I-017).
   * 문구로 구분하지 않고 배열을 나눈 것은, 문구만 바꿔도 집계가 조용히 틀어지기 때문이다.
   */
  skipped: string[]
}

type ArticleLink = { url: string; title?: string }

/**
 * 링크 1건의 처리 결과. **"실패"와 "요청하지 않음"을 타입으로 가른다** — 두 가지를 같은
 * `CrawlFailure` 배열에 담고 문구(`실행이 중단되어…`)로 구분하던 방식이 I-017의 직접 원인이었다.
 */
type PageOutcome =
  | { kind: 'article'; article: ArticleDraft }
  | { kind: 'failure'; failure: CrawlFailure }
  | { kind: 'skipped'; url: string }

/**
 * 원문 페이지 하나를 열어 제목·본문을 뽑고 최소 길이를 검사한다.
 * RSS(contentSelector 있음)·HTML 두 경로가 공유하는 유일한 본문 수집 지점이다 — 여기서 갈라지면
 * 이후 규칙 변경(정제 방식·길이 기준)이 한쪽에만 반영되는 사고가 난다.
 *
 * ⚠️ 제목은 `selectText`(공백을 한 칸으로 접어도 무방), 본문은 `extractArticleContent`(문단 개행 보존)로
 * 뽑는다. `selectText`를 본문에 쓰면 개행이 사라지고 txt 저장 후에는 재크롤 말고 복구 수단이 없다.
 */
async function collectArticlePage(
  pressId: string,
  runId: string,
  link: ArticleLink,
  contentSelector: string,
  titleSelector: string | undefined
): Promise<{ ok: true; article: ArticleDraft } | { ok: false; failure: CrawlFailure }> {
  const page = await fetchHtml({ url: link.url })
  if (!page.ok) {
    return { ok: false, failure: page }
  }

  const $ = loadDocument(page.html)
  // RSS 경로는 titleSelector가 없다(rssFields에 그 필드 자체가 없다) — 피드가 이미 준 제목(link.title)을 쓴다.
  const title = (titleSelector ? selectText($, titleSelector) : undefined) ?? link.title

  if (!title) {
    return {
      ok: false,
      failure: { ok: false, url: link.url, error: '제목을 찾을 수 없습니다', elapsedMs: page.elapsedMs },
    }
  }

  const content = extractArticleContent($, contentSelector)
  const check = checkArticleContent(content, 'article-page')
  if (!check.ok) {
    return {
      ok: false,
      failure: { ok: false, url: link.url, error: check.reason, elapsedMs: page.elapsedMs },
    }
  }

  return {
    ok: true,
    article: {
      pressId,
      runId,
      title,
      url: link.url,
      content: check.content,
      contentSource: 'article-page',
      crawledAt: new Date().toISOString(),
    },
  }
}

/**
 * 링크 목록을 동시성 제한 아래에서 본문 수집 단계로 밀어 넣는다. 동시성·지연은
 * `lib/crawler/config.ts`(화면에 노출하지 않는 값)를 그대로 쓴다 — `lib/crawler/run.ts`의
 * `runCrawl`과 같은 p-limit 패턴이되, 완료마다 `onArticleDone`을 부르는 점이 다르다.
 * 개별 작업이 예기치 않게 throw해도(예: 셀렉터 구문 오류) 배치 전체가 무너지지 않도록 값으로 잡는다.
 */
async function collectArticlePages(
  pressId: string,
  runId: string,
  links: ArticleLink[],
  contentSelector: string,
  titleSelector: string | undefined,
  hooks: PressCrawlHooks
): Promise<{ articles: ArticleDraft[]; failures: CrawlFailure[]; skipped: string[] }> {
  const limit = pLimit(crawlerConfig.concurrency)
  const delayMs = crawlerConfig.delayMs
  const target = links.length
  let collected = 0

  const results = await Promise.all(
    links.map((link, index) =>
      limit(async (): Promise<PageOutcome> => {
        if (delayMs > 0 && index > 0) {
          await sleep(delayMs)
        }
        // 중단은 "처리한 기사"가 아니다 — collected를 올리지 않고, onArticleDone도 부르지 않는다.
        // 여기서 세면 진행률이 100%까지 차오르며 "다 됐다"고 말하게 된다(I-017).
        if (hooks.isAborted?.()) {
          return { kind: 'skipped', url: link.url }
        }
        try {
          const result = await collectArticlePage(pressId, runId, link, contentSelector, titleSelector)
          return result.ok
            ? { kind: 'article', article: result.article }
            : { kind: 'failure', failure: result.failure }
        } catch (error) {
          return {
            kind: 'failure',
            failure: {
              ok: false,
              url: link.url,
              error: error instanceof Error ? error.message : String(error),
              elapsedMs: 0,
            },
          }
        } finally {
          collected += 1
          hooks.onArticleDone?.(pressId, collected, target)
        }
      })
    )
  )

  const articles: ArticleDraft[] = []
  const failures: CrawlFailure[] = []
  const skipped: string[] = []
  for (const result of results) {
    if (result.kind === 'article') articles.push(result.article)
    else if (result.kind === 'failure') failures.push(result.failure)
    else skipped.push(result.url)
  }
  return { articles, failures, skipped }
}

/**
 * RSS 요약 경로. `contentSelector`가 없으므로 원문 페이지를 한 번도 열지 않는다(Playwright 0회 기동).
 * 피드 항목 자체가 제목·요약을 이미 주므로 fetchHtml을 부를 이유가 없다.
 */
function collectRssSummaries(
  pressId: string,
  runId: string,
  items: FeedItem[],
  hooks: PressCrawlHooks
): PressCrawlResult {
  const articles: ArticleDraft[] = []
  const failures: CrawlFailure[] = []
  const target = items.length

  items.forEach((item, index) => {
    if (!item.link || !item.title) {
      failures.push({
        ok: false,
        url: item.link || '',
        error: '피드 항목에 제목 또는 링크가 없습니다',
        elapsedMs: 0,
      })
    } else {
      const check = checkArticleContent(item.summary, 'rss-summary')
      if (!check.ok) {
        failures.push({ ok: false, url: item.link, error: check.reason, elapsedMs: 0 })
      } else {
        articles.push({
          pressId,
          runId,
          title: item.title,
          url: item.link,
          content: check.content,
          contentSource: 'rss-summary',
          crawledAt: new Date().toISOString(),
        })
      }
    }
    hooks.onArticleDone?.(pressId, index + 1, target)
  })

  // RSS 요약 경로는 원문 페이지를 한 번도 요청하지 않으므로 "요청하지 않고 건너뛴 링크" 자체가 없다.
  return { pressId, articles, failures, skipped: [] }
}

async function crawlRssPress(
  press: RssPressSource,
  runId: string,
  maxCount: number,
  hooks: PressCrawlHooks
): Promise<PressCrawlResult> {
  const feedResult = await fetchFeed(press.feedUrl)
  if (!feedResult.ok) {
    // 피드 자체를 못 읽는 것은 개별 기사 격리 대상이 아니라 이 호출 전체의 실패다(D-003).
    return { pressId: press.id, articles: [], failures: [feedResult], skipped: [] }
  }

  // 링크를 이 개수로 자른 뒤에 기사 크롤(또는 요약 검사)에 들어간다 — 자르기 전에 다 처리하지 않는다.
  const items = feedResult.items.slice(0, maxCount)

  if (!press.contentSelector) {
    return collectRssSummaries(press.id, runId, items, hooks)
  }

  // 링크 없는 피드 항목은 원문 요청 자체를 시도할 수 없다. collectRssSummaries(174~181행)는
  // 이 경우를 명시적 실패로 기록하는데, 이 경로는 예전에 필터로 조용히 걸러내기만 해
  // failures에도 안 남고 onArticleDone도 안 불렸다(6일차 화면 워크스트림 리뷰 지적) —
  // 같은 모듈이 같은 입력 이상을 두 경로에서 다르게 처리하던 것을 여기서 맞춘다
  // (docs/CONVENTIONS.md §7 "개별 실패는 예외가 아니라 값으로 격리한다").
  const linkedItems = items.filter(
    (item): item is FeedItem & { link: string } => item.link.length > 0
  )
  const missingLinkFailures: CrawlFailure[] = items
    .filter((item) => item.link.length === 0)
    .map(() => ({ ok: false, url: '', error: '피드 항목에 링크가 없습니다', elapsedMs: 0 }))

  // 진행률(target)은 이 언론사가 원래 처리해야 할 전체 항목 수(items.length)를 유지한다 —
  // 링크 없는 항목을 먼저 "처리 완료"로 반영한 뒤, collectArticlePages가 보고하는 로컬
  // 진행(0..linkedItems.length)을 전역 진행(missingLinkFailures.length..items.length)으로
  // 옮겨 부른다. 그러지 않으면 같은 언론사 진행 중에 target이 items.length →
  // linkedItems.length로 튀어 화면 진행률이 거꾸로 가는 것처럼 보인다.
  const target = items.length
  missingLinkFailures.forEach((_, index) => hooks.onArticleDone?.(press.id, index + 1, target))

  const links = linkedItems.map((item) => ({ url: item.link, title: item.title }))
  const offsetHooks: PressCrawlHooks = {
    onArticleDone: (pressId, collected) =>
      hooks.onArticleDone?.(pressId, missingLinkFailures.length + collected, target),
    // isAborted를 빠뜨리면 이 경로(RSS 본문 전문)만 중단 신호를 못 받는다 — onArticleDone만
    // 옮겨 적다 생긴 실수라 명시적으로 짚어 둔다.
    isAborted: hooks.isAborted,
  }
  const { articles, failures, skipped } = await collectArticlePages(
    press.id,
    runId,
    links,
    press.contentSelector,
    undefined,
    offsetHooks
  )
  return { pressId: press.id, articles, failures: [...missingLinkFailures, ...failures], skipped }
}

async function crawlHtmlPress(
  press: HtmlPressSource,
  runId: string,
  maxCount: number,
  hooks: PressCrawlHooks
): Promise<PressCrawlResult> {
  const listPage = await fetchHtml({ url: press.listUrl })
  if (!listPage.ok) {
    return { pressId: press.id, articles: [], failures: [listPage], skipped: [] }
  }

  const $ = loadDocument(listPage.html)
  const allLinks = extractLinks($, press.listUrl, press.articleLinkSelector)

  if (allLinks.length === 0) {
    return {
      pressId: press.id,
      articles: [],
      failures: [
        {
          ok: false,
          url: press.listUrl,
          error: '목록 페이지에서 기사 링크를 찾지 못했습니다(셀렉터를 확인하세요)',
          elapsedMs: listPage.elapsedMs,
        },
      ],
      skipped: [],
    }
  }

  const links = allLinks.slice(0, maxCount).map((url) => ({ url }))
  const { articles, failures, skipped } = await collectArticlePages(
    press.id,
    runId,
    links,
    press.contentSelector,
    press.titleSelector,
    hooks
  )
  return { pressId: press.id, articles, failures, skipped }
}

/**
 * 언론사 1곳을 방식(`press.sourceType`)에 맞게 크롤한다. 분기는 "기사 URL을 어떻게 얻는가"
 * 한 지점뿐이다 — 그 이후(개수 제한·본문 정제·실패 격리·진행 콜백·Article 생성)는
 * `collectArticlePages`/`collectArticlePage`를 두 경로가 그대로 공유한다.
 *
 * 이 함수는 저장소·HTTP를 모른다. 파일 쓰기는 호출부가 한다.
 */
export async function crawlPress(
  press: PressSource,
  runId: string,
  options: PressCrawlOptions = {},
  hooks: PressCrawlHooks = {}
): Promise<PressCrawlResult> {
  const maxCount = resolveMaxArticlesPerPress(options.maxArticlesPerPress)

  return press.sourceType === 'rss'
    ? crawlRssPress(press, runId, maxCount, hooks)
    : crawlHtmlPress(press, runId, maxCount, hooks)
}
