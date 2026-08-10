import { describe, expect, it } from 'vitest'

import { crawlRunSchema, crawlStartRequestSchema } from './crawl-run'

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

/**
 * `targetCategories`(Task 027)가 생기기 전에 만들어진 `run-meta.json`은 이 키가 없다. skippedCount와
 * 같은 함정이다 — 필수로 두면 과거 파일이 파싱에서 떨어지고 listRuns가 그 run을 통째로 숨긴다.
 */
describe('crawlRunSchema — targetCategories 하위호환(Task 027)', () => {
  const legacyRunMeta = {
    id: '20260810-143205',
    targetPressIds: ['etnews'],
    startedAt: '2026-08-10T14:32:05+09:00',
    finishedAt: '2026-08-10T14:38:41+09:00',
    successCount: 51,
    failCount: 0,
    status: 'aborted',
  }

  it('targetCategories가 없는 과거 run-meta.json도 통과하고 빈 배열로 채운다', () => {
    const result = crawlRunSchema.safeParse(legacyRunMeta)

    expect(result.success).toBe(true)
    expect(result.data?.targetCategories).toEqual([])
  })

  it('targetCategories가 있으면 그대로 보존한다', () => {
    const result = crawlRunSchema.safeParse({ ...legacyRunMeta, targetCategories: ['it-ai', 'sports'] })

    expect(result.data?.targetCategories).toEqual(['it-ai', 'sports'])
  })

  it('카테고리 enum에 없는 값은 거부한다', () => {
    expect(
      crawlRunSchema.safeParse({ ...legacyRunMeta, targetCategories: ['알수없음'] }).success
    ).toBe(false)
  })
})

describe('crawlStartRequestSchema — pressIds/categories 중 최소 하나(Task 027)', () => {
  it('pressIds만 있으면 통과한다(기존 화면 경로, 그대로 유지)', () => {
    expect(crawlStartRequestSchema.safeParse({ pressIds: ['etnews'] }).success).toBe(true)
  })

  it('categories만 있어도 통과한다(Task 027이 더한 경로)', () => {
    expect(crawlStartRequestSchema.safeParse({ categories: ['sports'] }).success).toBe(true)
  })

  it('pressIds와 categories를 함께 보내도 통과한다(합집합 대상)', () => {
    expect(
      crawlStartRequestSchema.safeParse({ pressIds: ['etnews'], categories: ['sports'] }).success
    ).toBe(true)
  })

  it('둘 다 비어 있으면(또는 둘 다 없으면) 거부한다', () => {
    expect(crawlStartRequestSchema.safeParse({}).success).toBe(false)
    expect(crawlStartRequestSchema.safeParse({ pressIds: [], categories: [] }).success).toBe(false)
  })
})
