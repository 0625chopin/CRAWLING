export { crawlerConfig } from './config'
export { getBrowser, closeBrowser } from './browser'
export { fetchHtml } from './fetch-html'
export { runCrawl, type RunCrawlOptions } from './run'
export {
  loadDocument,
  selectText,
  selectAllText,
  selectAttr,
  extractLinks,
  extractMeta,
  type LoadedDocument,
} from './parse'
export {
  crawlTargetSchema,
  crawlRequestSchema,
  type CrawlTarget,
  type ResolvedCrawlTarget,
  type CrawlRequest,
  type CrawlResult,
  type CrawlSuccess,
  type CrawlFailure,
} from './types'
export {
  fetchFeed,
  type FeedItem,
  type FeedFetchResult,
  type FeedFetchSuccess,
} from './rss'
export {
  extractArticleContent,
  checkArticleContent,
  resolveMaxArticlesPerPress,
  DEFAULT_MAX_ARTICLES_PER_PRESS,
  MAX_ARTICLES_PER_PRESS,
  type ArticleContentCheck,
} from './article-parser'
export {
  crawlPress,
  type ArticleDraft,
  type PressCrawlHooks,
  type PressCrawlOptions,
  type PressCrawlResult,
} from './press-crawler'
export { startRun, getRunProgress, abortRun, RunAlreadyRunningError, RunNotAbortableError } from './run-manager'
// RunNotFoundError는 lib/storage/run-repository.ts(Task 007)가 던지는 곳이지만, getRunProgress·
// abortRun을 호출하는 라우트(015A·015B)가 run 생명주기 관련 예외 3종(RunAlreadyRunningError·
// RunNotAbortableError·RunNotFoundError)을 한 곳에서 import할 수 있도록 여기서도 재수출한다 —
// lib/crawler가 lib/storage를 가져오는 기존 방향 그대로다(8일차 교차검증 후속).
export { RunNotFoundError } from '@/lib/storage/run-repository'
