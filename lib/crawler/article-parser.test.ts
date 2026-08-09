import { describe, expect, it } from 'vitest'

import { loadDocument } from './parse'

import {
  checkArticleContent,
  DEFAULT_MAX_ARTICLES_PER_PRESS,
  extractArticleContent,
  MAX_ARTICLES_PER_PRESS,
  resolveMaxArticlesPerPress,
} from './article-parser'

describe('extractArticleContent — 문단 개행 보존', () => {
  it('컨테이너 셀렉터(zdnet 유형)는 자손 <p>를 문단으로 모으고 스크립트·광고 텍스트를 제거한다', () => {
    const $ = loadDocument(`
      <html><body>
        <div id="articleBody">
          <script>var trackAd = 1;</script>
          <div class="ad-banner">배너 광고 텍스트</div>
          <p>삼성전자가 차세대 HBM4 메모리 양산에 돌입했다.</p>
          <p>업계는 이번 발표를 긍정적으로 평가했다.</p>
        </div>
      </body></html>
    `)

    const content = extractArticleContent($, '#articleBody')

    expect(content).toBe(
      '삼성전자가 차세대 HBM4 메모리 양산에 돌입했다.\n\n업계는 이번 발표를 긍정적으로 평가했다.'
    )
    // selectText로 뭉갠 게 아니라는 증거 — 문단 사이 개행이 2개 이상 남아 있어야 한다.
    expect(content.match(/\n/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(content).not.toMatch(/trackAd|배너 광고/)
  })

  it('셀렉터가 이미 <p> 단위(아이뉴스24 유형: `#articleBody > p`)면 매칭된 요소 자체를 문단으로 쓴다', () => {
    const $ = loadDocument(`
      <html><body>
        <div id="articleBody">
          <p>기자 바이라인부터 시작한다.</p>
          <div class="ad">여기는 광고</div>
          <p>마지막 문단이다.</p>
        </div>
      </body></html>
    `)

    const content = extractArticleContent($, '#articleBody > p')

    expect(content).toBe('기자 바이라인부터 시작한다.\n\n마지막 문단이다.')
  })

  it('<p>가 하나도 없으면(사진 기사 등) 컨테이너 전체 텍스트를 한 문단으로 반환한다', () => {
    const $ = loadDocument(`
      <html><body><div id="articleBody">사진 설명만 있는   기사입니다.</div></body></html>
    `)

    const content = extractArticleContent($, '#articleBody')

    expect(content).toBe('사진 설명만 있는 기사입니다.')
  })

  it('셀렉터가 매칭되지 않으면 빈 문자열을 반환한다', () => {
    const $ = loadDocument('<html><body><div>본문 없음</div></body></html>')

    expect(extractArticleContent($, '#no-such-selector')).toBe('')
  })
})

describe('checkArticleContent — 최소 길이 검사', () => {
  it('article-page는 100자 미만이면 값으로 실패를 돌려준다(예외를 던지지 않는다)', () => {
    const result = checkArticleContent('짧은 본문', 'article-page')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/100자/)
  })

  it('article-page는 100자 이상이면 통과한다', () => {
    const content = '가'.repeat(100)

    expect(checkArticleContent(content, 'article-page')).toEqual({ ok: true, content })
  })

  it('rss-summary는 하한이 50자로 낮다', () => {
    const content = '가'.repeat(60)

    expect(checkArticleContent(content, 'rss-summary').ok).toBe(true)
    expect(checkArticleContent('가'.repeat(40), 'rss-summary').ok).toBe(false)
  })
})

describe('resolveMaxArticlesPerPress — 기본값 20 / 상한 100', () => {
  it('값이 없으면 기본값 20을 쓴다', () => {
    expect(resolveMaxArticlesPerPress(undefined)).toBe(DEFAULT_MAX_ARTICLES_PER_PRESS)
  })

  it('상한 100을 넘는 값은 100으로 자른다', () => {
    expect(resolveMaxArticlesPerPress(9999)).toBe(MAX_ARTICLES_PER_PRESS)
  })

  it('0 이하는 1로 올린다', () => {
    expect(resolveMaxArticlesPerPress(0)).toBe(1)
    expect(resolveMaxArticlesPerPress(-5)).toBe(1)
  })

  it('정상 범위 값은 그대로 쓴다', () => {
    expect(resolveMaxArticlesPerPress(5)).toBe(5)
  })
})
