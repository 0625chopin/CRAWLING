import { z } from 'zod'

/**
 * 크롤 대상 1건의 스키마. `fetchHtml`이 이 스키마로 입력을 검증한 뒤에만 브라우저를 연다
 * (I-018 정리 이후 이 스키마의 유일한 소비자는 `fetch-html.ts`다 — D-039).
 */
export const crawlTargetSchema = z.object({
  /** 크롤 대상 URL. http/https만 허용한다. */
  url: z
    .url()
    .refine(
      (value) => /^https?:\/\//i.test(value),
      'http 또는 https URL만 지원합니다'
    ),
  /** 페이지 로드 완료 판정 기준. 동적 렌더링 사이트는 networkidle이 필요할 수 있다. */
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
    .default('domcontentloaded'),
  /** 이 셀렉터가 나타날 때까지 추가로 기다린다. 클라이언트 렌더링 대응용. */
  waitForSelector: z.string().min(1).optional(),
  /** 페이지 단위 타임아웃(ms). */
  timeoutMs: z.number().int().positive().max(120_000).optional(),
})

export type CrawlTarget = z.input<typeof crawlTargetSchema>
export type ResolvedCrawlTarget = z.output<typeof crawlTargetSchema>

/** 크롤 성공 결과. */
export interface CrawlSuccess {
  ok: true
  url: string
  /** 리다이렉트 이후 최종 URL. */
  finalUrl: string
  status: number
  title: string
  html: string
  /** 페이지 로드에 걸린 시간(ms). */
  elapsedMs: number
}

/** 크롤 실패 결과. 개별 실패가 배치 전체를 무너뜨리지 않도록 값으로 표현한다. */
export interface CrawlFailure {
  ok: false
  url: string
  error: string
  elapsedMs: number
}

export type CrawlResult = CrawlSuccess | CrawlFailure
