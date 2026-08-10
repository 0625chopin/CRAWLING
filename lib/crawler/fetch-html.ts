import type { BrowserContext } from 'playwright'

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

  // 브라우저 기동·컨텍스트 생성까지 try 안에 둔다. 예전에는 이 두 줄이 try 밖에 있어서
  // Playwright 기동 실패(바이너리 없음·OOM·권한)만 위 doc의 계약을 깨고 예외로 새어 나갔고,
  // 그 예외가 runInBackground의 Promise.all을 reject시켜 run이 영원히 'running'에 멈췄다(I-051).
  let context: BrowserContext | null = null

  try {
    const browser = await getBrowser()
    // 요청마다 새 컨텍스트를 써서 쿠키/스토리지가 대상 간에 섞이지 않게 한다.
    context = await browser.newContext({
      userAgent: crawlerConfig.userAgent,
    })

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
    // finally에서 던지면 위 return/catch가 만든 CrawlResult가 통째로 예외로 바뀐다 — 계약을
    // 지키러 온 코드가 계약을 깨는 자리라 여기서만은 정리 실패를 삼킨다. 원인은 콘솔에 남긴다.
    try {
      await context?.close()
    } catch (closeError) {
      console.warn(`[fetch-html] 브라우저 컨텍스트 정리에 실패했습니다: ${url}`, closeError)
    }
  }
}
