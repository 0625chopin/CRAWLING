import { describe, expect, it } from 'vitest'

import { articleSchema } from './article'

const baseArticle = {
  id: '0001',
  pressId: 'etnews',
  runId: '20260810-090000',
  title: '제목',
  url: 'https://example.com/a/1',
  content: '본문',
  contentSource: 'rss-summary' as const,
  crawledAt: '2026-08-10T09:00:00+09:00',
}

// Task 026 — category는 크롤 파이프라인(Task 027)이 나중에 채우는 스냅샷이라 기본값이 없는
// 순수 선택 필드다. 지금까지 저장된 기사 txt는 전부 이 필드가 없으므로, 없어도 파싱이
// 떨어지지 않아야 한다(D-026·I-022와 같은 함정 — 필수로 두면 기존 기사가 손상 취급된다).
describe('articleSchema — category(Task 026)', () => {
  it('category 키가 없어도 파싱되고 undefined로 남는다(카테고리 미상)', () => {
    const result = articleSchema.parse(baseArticle)
    expect(result.category).toBeUndefined()
  })

  it('category가 있으면 그대로 보존한다', () => {
    const result = articleSchema.parse({ ...baseArticle, category: 'sports' })
    expect(result.category).toBe('sports')
  })

  it('5종을 벗어난 category 값은 거부한다', () => {
    const result = articleSchema.safeParse({ ...baseArticle, category: 'politics' })
    expect(result.success).toBe(false)
  })
})
