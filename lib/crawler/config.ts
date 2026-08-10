/** 크롤러 기본값. 환경변수로 덮어쓸 수 있다. (.env.example 참고) */

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const crawlerConfig = {
  /** 동시에 열어 둘 페이지 수 상한. 대상 서버에 부담을 주지 않는 선에서 설정한다. */
  concurrency: readInt(process.env.CRAWL_CONCURRENCY, 2),
  /**
   * 실행(run) 안에서 동시에 크롤할 언론사 수 상한(D-015). `concurrency`는 언론사 1곳(=대상 서버
   * 1곳)으로 가는 동시 페이지 수를 막는 안전장치라 서로 다른 언론사를 병렬로 돌려도 특정 서버의
   * 부담은 늘지 않는다 — 다만 이 프로세스가 동시에 여는 Playwright 페이지 총량(언론사 수 ×
   * concurrency)은 로컬 리소스이므로, 선택 언론사가 많아져도 무한정 커지지 않도록 여기서 한 번 더
   * 제한한다(lib/crawler/run-manager.ts가 이 값으로 pLimit를 만든다).
   */
  pressConcurrency: readInt(process.env.CRAWL_PRESS_CONCURRENCY, 3),
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
