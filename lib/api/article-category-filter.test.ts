import { describe, expect, it } from 'vitest'

import { matchesCategoryFilter } from './article-category-filter'

describe('matchesCategoryFilter', () => {
  it('필터가 없으면(undefined) 전부 통과시킨다', () => {
    expect(matchesCategoryFilter('sports', undefined)).toBe(true)
    expect(matchesCategoryFilter(undefined, undefined)).toBe(true)
  })

  it('필터가 빈 배열이어도 전부 통과시킨다', () => {
    expect(matchesCategoryFilter('sports', [])).toBe(true)
  })

  it('기사 카테고리가 필터에 포함되면 통과시킨다', () => {
    expect(matchesCategoryFilter('sports', ['sports', 'economy'])).toBe(true)
  })

  it('기사 카테고리가 필터에 없으면 걸러낸다', () => {
    expect(matchesCategoryFilter('stock', ['sports', 'economy'])).toBe(false)
  })

  // 21일차 팀장 판정으로 뒤집힌 규칙 — 처음에는 "미상은 통과"였다. 미상 기사가 026 이후에도
  // 영원히 undefined로 남아 모든 카테고리 필터에 계속 새어 들어가는 쪽이(영구적 단점) "Task 027
  // 전까지 결과가 0건"보다(한시적 단점) 더 나쁘다는 판단이다(article-category-filter.ts 상단 주석).
  it('기사에 카테고리 값이 없으면(카테고리 미상) 필터가 걸려 있을 때 걸러낸다', () => {
    expect(matchesCategoryFilter(undefined, ['sports'])).toBe(false)
  })
})
