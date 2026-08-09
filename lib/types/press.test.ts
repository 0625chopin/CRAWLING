import { describe, expect, it } from 'vitest'

import { htmlPressSchema, pressCreateSchema, pressSchema, rssPressSchema } from './press'

// discriminatedUnion 거부 케이스 회귀 확인 — 통과하면 화면은 멀쩡해 보이지만
// data/press-sources.json에 방식이 섞인 잡종 레코드가 쌓인다(docs/ROADMAP.md Task 004 DoD).
describe('pressCreateSchema — discriminatedUnion 거부 케이스', () => {
  it('sourceType이 rss인데 html 전용 필드(articleLinkSelector)를 보내면 거부한다', () => {
    const result = pressCreateSchema.safeParse({
      name: '전자신문',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://rss.etnews.com/Section901.xml',
      articleLinkSelector: '.article-list a.tit',
    })

    expect(result.success).toBe(false)
  })

  it('sourceType이 html인데 셀렉터 3개 중 하나(titleSelector)가 비면 거부한다', () => {
    const result = pressCreateSchema.safeParse({
      name: 'IT조선',
      isActive: true,
      sourceType: 'html',
      listUrl: 'https://it.chosun.com/news/it',
      articleLinkSelector: '.article-list a.tit',
      contentSelector: '#article-view-content-div',
    })

    expect(result.success).toBe(false)
  })

  it('sourceType이 html인데 셀렉터 3개가 전부 비면 거부한다', () => {
    const result = pressCreateSchema.safeParse({
      name: 'IT조선',
      isActive: true,
      sourceType: 'html',
      listUrl: 'https://it.chosun.com/news/it',
    })

    expect(result.success).toBe(false)
  })

  it('rss는 feedUrl만으로 통과한다(셀렉터 없이 등록 가능)', () => {
    const result = pressCreateSchema.safeParse({
      name: '전자신문',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://rss.etnews.com/Section901.xml',
    })

    expect(result.success).toBe(true)
  })

  it('rss + contentSelector가 있으면 원문 전문 수집 의사로 통과한다', () => {
    const result = pressCreateSchema.safeParse({
      name: 'ZDNet Korea',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://zdnet.co.kr/news/news_xml.asp',
      contentSelector: '#articleBody',
    })

    expect(result.success).toBe(true)
  })

  it('html은 셀렉터 3개가 모두 있어야 통과한다', () => {
    const result = pressCreateSchema.safeParse({
      name: 'IT조선',
      isActive: true,
      sourceType: 'html',
      listUrl: 'https://it.chosun.com/news/it',
      articleLinkSelector: '.article-list a.tit',
      titleSelector: 'h1.article-title',
      contentSelector: '#article-view-content-div',
    })

    expect(result.success).toBe(true)
  })
})

describe('pressSchema — 저장된 레코드(id 포함) 검증', () => {
  it('rss 레코드에 html 전용 필드가 섞여 있으면 거부한다', () => {
    const result = rssPressSchema.safeParse({
      id: 'etnews',
      name: '전자신문',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://rss.etnews.com/Section901.xml',
      listUrl: 'https://it.chosun.com/news/it',
    })

    expect(result.success).toBe(false)
  })

  it('id가 슬러그 형식이 아니면 거부한다', () => {
    const result = pressSchema.safeParse({
      id: 'ETNEWS_1',
      name: '전자신문',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://rss.etnews.com/Section901.xml',
    })

    expect(result.success).toBe(false)
  })

  it('방식이 다른 두 유효 레코드를 모두 discriminatedUnion으로 판별한다', () => {
    const rss = pressSchema.parse({
      id: 'etnews',
      name: '전자신문',
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://rss.etnews.com/Section901.xml',
    })
    const html = pressSchema.parse({
      id: 'itchosun',
      name: 'IT조선',
      isActive: true,
      sourceType: 'html',
      listUrl: 'https://it.chosun.com/news/it',
      articleLinkSelector: '.article-list a.tit',
      titleSelector: 'h1.article-title',
      contentSelector: '#article-view-content-div',
    })

    expect(rss.sourceType).toBe('rss')
    expect(html.sourceType).toBe('html')
    // htmlPressSchema로 좁혀지면 articleLinkSelector 접근이 안전해진다는 것을 타입 수준에서도 확인한다.
    if (html.sourceType === 'html') {
      expect(htmlPressSchema.shape.articleLinkSelector.parse(html.articleLinkSelector)).toBe(
        html.articleLinkSelector
      )
    }
  })
})
