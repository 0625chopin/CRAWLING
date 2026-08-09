import { chromium, type Browser } from 'playwright'

import { crawlerConfig } from './config'

/**
 * 브라우저 인스턴스는 기동 비용이 크므로 프로세스당 하나만 유지한다.
 * dev 모드의 HMR은 모듈을 다시 평가하므로 globalThis에 붙여야 인스턴스가 누적되지 않는다.
 */
const globalForBrowser = globalThis as unknown as {
  __crawlerBrowser?: Promise<Browser>
}

export function getBrowser(): Promise<Browser> {
  globalForBrowser.__crawlerBrowser ??= chromium
    .launch({
      headless: crawlerConfig.headless,
      channel: crawlerConfig.channel,
    })
    .then((browser) => {
      // 브라우저가 외부 요인으로 죽으면 캐시를 비워 다음 호출에서 재기동되게 한다.
      browser.on('disconnected', () => {
        globalForBrowser.__crawlerBrowser = undefined
      })
      return browser
    })
    .catch((error) => {
      globalForBrowser.__crawlerBrowser = undefined
      throw error
    })

  return globalForBrowser.__crawlerBrowser
}

/** 명시적으로 브라우저를 내린다. 테스트나 스크립트 종료 시 사용한다. */
export async function closeBrowser(): Promise<void> {
  const pending = globalForBrowser.__crawlerBrowser
  if (!pending) return

  globalForBrowser.__crawlerBrowser = undefined
  const browser = await pending.catch(() => null)
  await browser?.close()
}
