/** 크롤러 기본값. 환경변수로 덮어쓸 수 있다. (.env.example 참고) */

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const crawlerConfig = {
  /** 동시에 열어 둘 페이지 수 상한. 대상 서버에 부담을 주지 않는 선에서 설정한다. */
  concurrency: readInt(process.env.CRAWL_CONCURRENCY, 2),
  /** 페이지 단위 타임아웃(ms). */
  timeoutMs: readInt(process.env.CRAWL_TIMEOUT_MS, 30_000),
  /** 각 요청 사이에 넣는 최소 지연(ms). 과도한 요청을 막는 안전장치. */
  delayMs: readInt(process.env.CRAWL_DELAY_MS, 500),
  /**
   * 사용할 브라우저 채널. 'chromium'이면 Playwright 번들 브라우저를 쓰고,
   * 'chrome' 등을 지정하면 시스템에 설치된 브라우저를 사용한다.
   */
  channel: process.env.PLAYWRIGHT_CHANNEL?.trim() || undefined,
  /** 헤드리스 여부. 디버깅 시 PLAYWRIGHT_HEADLESS=false 로 창을 띄운다. */
  headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  userAgent:
    process.env.CRAWL_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
} as const
