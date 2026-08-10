import { describe, expect, it } from 'vitest'

import { categoryQuerySchema, readCategoryParams } from './query-params'

describe('readCategoryParams', () => {
  it('category 파라미터가 없으면 undefined다(필터 없음)', () => {
    expect(readCategoryParams(new URLSearchParams())).toBeUndefined()
  })

  it('반복 파라미터를 모두 모은다', () => {
    const params = new URLSearchParams('category=sports&category=economy')
    expect(readCategoryParams(params)).toEqual(['sports', 'economy'])
  })
})

describe('categoryQuerySchema', () => {
  it('undefined는 그대로 통과한다(필터 없음)', () => {
    const result = categoryQuerySchema.safeParse(undefined)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBeUndefined()
  })

  it('유효한 카테고리 값을 PressCategory[]로 파싱한다', () => {
    const result = categoryQuerySchema.safeParse(['sports', 'economy'])
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(['sports', 'economy'])
  })

  it('잘못된 카테고리 값은 필드별 한국어 메시지로 거부한다', () => {
    const result = categoryQuerySchema.safeParse(['no-such-category'])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('category는')
    }
  })
})
