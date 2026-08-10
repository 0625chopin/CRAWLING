import { describe, expect, it } from 'vitest'

import type { Article } from '@/lib/types/article'

import { parseArticle, serializeArticle } from './article-file'

const baseArticle: Article = {
  id: '0001',
  runId: '20260810-143205',
  pressId: 'etnews',
  title: '삼성전자, HBM4 메모리 양산 돌입',
  url: 'https://www.etnews.com/news/2026081000123',
  content: '삼성전자가 차세대 HBM4 메모리 양산에 돌입했다고 10일 밝혔다.',
  contentSource: 'article-page',
  crawledAt: '2026-08-10T14:33:10+09:00',
}

function roundTrip(article: Article) {
  const text = serializeArticle(article)
  const parsed = parseArticle(text, { runId: article.runId, articleId: article.id })
  return { text, parsed }
}

describe('serializeArticle → parseArticle 왕복', () => {
  it('기본 기사는 모든 필드가 원본과 일치한다', () => {
    const { parsed } = roundTrip(baseArticle)
    expect(parsed).toEqual(baseArticle)
  })

  it('제목에 콜론과 #이 섞여 있어도 메타 라인 값이 그대로 보존된다', () => {
    // 메타 라인 파서는 "# key: " 뒤 나머지를 통째로 값으로 읽으므로 콜론·#은 이스케이프가 필요 없다.
    const article: Article = { ...baseArticle, title: '속보: AI 규제안 통과 #긴급' }

    const { parsed } = roundTrip(article)

    expect(parsed).toEqual(article)
  })

  it('본문 없이 제목만으로 이루어진 URL에 물음표·앰퍼샌드가 섞여도 그대로 보존된다', () => {
    const article: Article = {
      ...baseArticle,
      url: 'https://www.etnews.com/news?id=123&ref=home#section',
    }

    const { parsed } = roundTrip(article)

    expect(parsed.url).toBe(article.url)
  })

  it('제목에 개행이 섞이면 저장 전 공백으로 접혀 메타 라인이 한 줄로 유지된다', () => {
    // ROADMAP Task 007 구현 규칙: "제목·URL은 저장 전에 개행 제거" — 메타 라인에 개행이 남으면
    // 다음 physical line이 새 메타 필드로 오인돼 파싱이 깨진다. 그래서 왕복 결과는 원본이 아니라
    // 개행이 공백 하나로 치환된 값과 일치해야 한다.
    const article: Article = {
      ...baseArticle,
      title: '삼성전자,\nHBM4 메모리\n양산 돌입',
    }

    const { text, parsed } = roundTrip(article)

    expect(parsed.title).toBe('삼성전자, HBM4 메모리 양산 돌입')
    // 메타 블록이 여전히 7줄(필드 7개)인지 — 개행이 실제로 살아남지 않았는지를 직접 확인한다.
    const metaBlock = text.slice(0, text.indexOf('\n\n'))
    expect(metaBlock.split('\n')).toHaveLength(7)
  })

  it('URL에 개행이 섞여도 저장 전 공백으로 접혀 메타 라인이 한 줄로 유지된다', () => {
    // 코드 경로는 title과 동일(sanitizeMetaValue)이지만 지금까지 title만 테스트돼 있었다 —
    // 리뷰에서 지적된 공백을 메운다.
    const article: Article = {
      ...baseArticle,
      url: 'https://www.etnews.com/news/2026081000123?ref=\nhome',
    }

    const { text, parsed } = roundTrip(article)

    expect(parsed.url).toBe('https://www.etnews.com/news/2026081000123?ref= home')
    const metaBlock = text.slice(0, text.indexOf('\n\n'))
    expect(metaBlock.split('\n')).toHaveLength(7)
  })

  it('본문에 빈 줄(문단 구분)이 섞인 기사도 개행이 그대로 살아 있다', () => {
    // article-parser.ts(Task 013A)가 문단 사이를 '\n\n'으로 이어 붙여 보존한다 —
    // 저장 계층(Task 007)이 그것을 접으면 화면 미리보기의 whitespace-pre-wrap 전제가 깨진다.
    const article: Article = {
      ...baseArticle,
      content: '첫 문단이다.\n\n둘째 문단이다.\n\n셋째 문단이다.',
    }

    const { parsed } = roundTrip(article)

    expect(parsed.content).toBe('첫 문단이다.\n\n둘째 문단이다.\n\n셋째 문단이다.')
  })

  it('본문이 빈 문자열이어도 왕복이 깨지지 않는다', () => {
    const article: Article = { ...baseArticle, content: '' }

    const { parsed } = roundTrip(article)

    expect(parsed.content).toBe('')
  })

  it('contentSource가 rss-summary인 경우도 그대로 보존된다(본문 편향 추적용 필드, 필수)', () => {
    const article: Article = { ...baseArticle, contentSource: 'rss-summary' }

    const { parsed } = roundTrip(article)

    expect(parsed.contentSource).toBe('rss-summary')
  })

  // Task 027: 크롤 시점 언론사 카테고리 스냅샷이 메타 라인에 실려 왕복한다.
  it('category가 있으면 메타 라인에 실려 왕복 후에도 보존된다(Task 027)', () => {
    const article: Article = { ...baseArticle, category: 'it-ai' }

    const { text, parsed } = roundTrip(article)

    expect(parsed.category).toBe('it-ai')
    expect(text).toContain('# category: it-ai')
  })

  // Task 027 이전에 저장된 기사 txt에는 category 메타 라인이 아예 없다 — 그런 파일도 예외 없이
  // 그대로 읽혀야 한다(CONVENTIONS §7, 없으면 undefined로 흘린다).
  it('category 메타 라인이 없는 기존 기사 txt도 그대로 읽힌다(Task 027 이전 파일과의 호환)', () => {
    const legacyText = serializeArticle(baseArticle) // baseArticle에는 category가 없다

    const parsed = parseArticle(legacyText, { runId: baseArticle.runId, articleId: baseArticle.id })

    expect(parsed.category).toBeUndefined()
    expect(legacyText).not.toContain('# category:')
  })
})

describe('parseArticle — 손상된 파일 방어(docs/CONVENTIONS.md §7)', () => {
  it('메타 구분줄(빈 줄)이 없으면 예외를 던진다', () => {
    const broken = '# id: 0001\n본문만 있고 구분줄이 없음'

    expect(() =>
      parseArticle(broken, { runId: baseArticle.runId, articleId: '0001' })
    ).toThrow()
  })

  it('메타 라인에 알 수 없는 형식이 섞이면 예외를 던진다', () => {
    const broken = '# id: 0001\n형식이 아닌 줄\n\n본문'

    expect(() =>
      parseArticle(broken, { runId: baseArticle.runId, articleId: '0001' })
    ).toThrow()
  })

  it('contentSource 메타 라인이 통째로 빠지면 예외를 던진다', () => {
    // contentSource는 ROADMAP Task 007 구현 규칙상 필수 메타 라인이다(본문 편향 추적용, PRD §Article).
    // 형식은 멀쩡한 6줄이지만 필드 하나가 빠진 경우라 "형식이 아닌 줄" 케이스와는 다른 경로를 탄다.
    const broken = [
      '# id: 0001',
      `# runId: ${baseArticle.runId}`,
      '# pressId: etnews',
      '# title: 제목',
      '# url: https://example.com/0001',
      '# crawledAt: 2026-08-10T14:33:10+09:00',
      '',
      '본문',
    ].join('\n')

    expect(() =>
      parseArticle(broken, { runId: baseArticle.runId, articleId: '0001' })
    ).toThrow()
  })

  it('파일 메타의 id·runId가 파일 경로(context)와 다르면 예외를 던진다', () => {
    const text = serializeArticle(baseArticle)

    expect(() =>
      parseArticle(text, { runId: baseArticle.runId, articleId: '9999' })
    ).toThrow()
    expect(() =>
      parseArticle(text, { runId: '20260101-000000', articleId: baseArticle.id })
    ).toThrow()
  })
})
