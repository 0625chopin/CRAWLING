import { describe, expect, it } from 'vitest'

import { crawlRunSchema } from './crawl-run'

/**
 * `skippedCount`(I-017)가 생기기 전에 만들어진 `run-meta.json`은 이 키가 없다. 이 필드를 필수로
 * 두면 과거 파일이 `crawlRunSchema.safeParse`에서 떨어지고 → `readRunMeta`가 손상으로 던지고 →
 * `listRuns`가 그 예외를 삼켜 **해당 run이 실행 목록에서 통째로 사라진다**(D-026이 실제 코드
 * 경로로 확인한 함정). 사라지는 쪽은 아무 오류도 내지 않으므로 화면만 봐서는 알 수 없다.
 */
describe('crawlRunSchema — skippedCount 하위호환', () => {
  const legacyRunMeta = {
    id: '20260810-143205',
    targetPressIds: ['etnews'],
    startedAt: '2026-08-10T14:32:05+09:00',
    finishedAt: '2026-08-10T14:38:41+09:00',
    successCount: 51,
    failCount: 0,
    status: 'aborted',
  }

  it('skippedCount가 없는 과거 run-meta.json도 통과하고 0으로 채운다', () => {
    const result = crawlRunSchema.safeParse(legacyRunMeta)

    expect(result.success).toBe(true)
    expect(result.data?.skippedCount).toBe(0)
  })

  it('skippedCount가 있으면 그 값을 그대로 보존한다', () => {
    const result = crawlRunSchema.safeParse({ ...legacyRunMeta, skippedCount: 43 })

    expect(result.data?.skippedCount).toBe(43)
  })

  it('음수·소수는 거부한다', () => {
    expect(crawlRunSchema.safeParse({ ...legacyRunMeta, skippedCount: -1 }).success).toBe(false)
    expect(crawlRunSchema.safeParse({ ...legacyRunMeta, skippedCount: 1.5 }).success).toBe(false)
  })
})
