import { getBrowser } from './browser'
import { crawlerConfig } from './config'
import { crawlTargetSchema, type CrawlResult, type CrawlTarget } from './types'

/**
 * 대상 URL을 브라우저로 열어 렌더링된 HTML을 가져온다.
 * 실패는 예외로 던지지 않고 CrawlFailure 값으로 돌려주어 배치 처리에서 개별 격리가 되게 한다.
 */
export async function fetchHtml(target: CrawlTarget): Promise<CrawlResult> {
  const parsed = crawlTargetSchema.safeParse(target)
  if (!parsed.success) {
    return {
      ok: false,
      url: String(target?.url ?? ''),
      error: parsed.error.issues.map((issue) => issue.message).join(', '),
      elapsedMs: 0,
    }
  }

  const { url, waitUntil, waitForSelector, timeoutMs } = parsed.data
  const timeout = timeoutMs ?? crawlerConfig.timeoutMs
  const startedAt = Date.now()

  const browser = await getBrowser()
  // 요청마다 새 컨텍스트를 써서 쿠키/스토리지가 대상 간에 섞이지 않게 한다.
  const context = await browser.newContext({
    userAgent: crawlerConfig.userAgent,
  })

  try {
    const page = await context.newPage()
    const response = await page.goto(url, { waitUntil, timeout })

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout })
    }

    const [html, title] = await Promise.all([page.content(), page.title()])

    return {
      ok: true,
      url,
      finalUrl: page.url(),
      // goto가 null을 반환하는 경우(about:blank 등)는 상태 코드를 알 수 없어 0으로 둔다.
      status: response?.status() ?? 0,
      title,
      html,
      elapsedMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
    }
  } finally {
    await context.close()
  }
}
