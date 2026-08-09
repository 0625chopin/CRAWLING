import pLimit from 'p-limit'

import { crawlerConfig } from './config'
import { fetchHtml } from './fetch-html'
import type { CrawlResult, CrawlTarget } from './types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface RunCrawlOptions {
  /** 동시 실행 상한. 미지정 시 crawlerConfig.concurrency를 쓴다. */
  concurrency?: number
  /** 각 작업 시작 전 대기 시간(ms). 대상 서버 부하를 낮추기 위한 기본 안전장치. */
  delayMs?: number
}

/**
 * 여러 대상을 동시성 제한 아래에서 크롤한다.
 * 개별 대상의 실패는 CrawlFailure로 격리되므로 전체가 중단되지 않는다.
 * 결과 순서는 입력 targets 순서와 일치한다.
 */
export async function runCrawl(
  targets: CrawlTarget[],
  options: RunCrawlOptions = {}
): Promise<CrawlResult[]> {
  const concurrency = options.concurrency ?? crawlerConfig.concurrency
  const delayMs = options.delayMs ?? crawlerConfig.delayMs
  const limit = pLimit(concurrency)

  return Promise.all(
    targets.map((target, index) =>
      limit(async () => {
        // 동시 실행 슬롯 안에서 순번만큼 지연을 줘 요청이 한꺼번에 몰리지 않게 한다.
        if (delayMs > 0 && index > 0) {
          await sleep(delayMs)
        }
        return fetchHtml(target)
      })
    )
  )
}
