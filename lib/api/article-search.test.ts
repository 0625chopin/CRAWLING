import { describe, expect, it } from 'vitest'

import { matchesArticleQuery } from './article-search'

const entry = { fileName: '0001.txt', title: '삼성전자, HBM4 메모리 양산 돌입' }

describe('matchesArticleQuery', () => {
  it('빈 검색어는 전체를 통과시킨다', () => {
    expect(matchesArticleQuery(entry, '')).toBe(true)
    expect(matchesArticleQuery(entry, '   ')).toBe(true)
  })

  it('제목 부분 일치를 찾는다', () => {
    expect(matchesArticleQuery(entry, 'HBM4')).toBe(true)
  })

  it('파일명 부분 일치를 찾는다', () => {
    expect(matchesArticleQuery(entry, '0001')).toBe(true)
  })

  it('대소문자를 무시한다(영문 파일명·제목 기준)', () => {
    const englishEntry = { fileName: 'AI-Report.txt', title: 'Samsung HBM4 Launch' }
    expect(matchesArticleQuery(englishEntry, 'ai-report')).toBe(true)
    expect(matchesArticleQuery(englishEntry, 'samsung')).toBe(true)
    expect(matchesArticleQuery(englishEntry, 'SAMSUNG')).toBe(true)
  })

  it('일치하지 않으면 false를 돌려준다', () => {
    expect(matchesArticleQuery(entry, '카카오')).toBe(false)
  })
})
