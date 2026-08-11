import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchFeed, type FeedFetchResult } from './rss'

/**
 * fetchFeed는 실제 네트워크를 쓰므로 global.fetch를 스텁으로 바꿔 순수하게 파싱 로직만 검증한다
 * (docs/CONVENTIONS.md §9 — vitest는 lib/ 순수 함수 전용이며 네트워크 의존 테스트는 두지 않는다).
 * EUC-KR 실제 디코딩은 손으로 만든 바이트로 재현할 수 없어 이 스위트에 넣지 않았다 —
 * `docs/press-candidates.md`가 확보한 실물 보안뉴스 피드로 별도 수동 검증했다(회차 보고 참고).
 *
 * fetchFeed는 예외를 던지지 않고 `{ ok: true, items } | { ok: false, error }` 값을 돌려준다
 * (`lib/crawler/fetch-html.ts`의 CrawlResult 관용구와 동일 — 2일차 교차검증 반영).
 */

function respond(body: BodyInit, contentType: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': contentType } })
}

function stubFetch(response: Response | (() => Promise<Response>)): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => (typeof response === 'function' ? response() : response))
  )
}

/** 성공 결과가 아니면 즉시 테스트를 실패시켜, 이후 단언에서 items에 타입 좁히기로 접근한다. */
function assertOk(result: FeedFetchResult): asserts result is FeedFetchResult & { ok: true } {
  if (!result.ok) throw new Error(`성공을 기대했지만 실패했다: ${result.error}`)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchFeed — RSS 2.0', () => {
  it('item을 FeedItem[]으로 정규화하고 CDATA 요약에서 태그를 걷어낸다', async () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <rss><channel>
        <item>
          <title>삼성전자, HBM4 양산 돌입</title>
          <link>https://example.com/articles/1</link>
          <description><![CDATA[<p>삼성전자가 <img src="x.png"/>HBM4 메모리 양산에 돌입했다.</p>]]></description>
          <pubDate>Sun, 9 Aug 2026 15:45:00 +0900</pubDate>
        </item>
      </channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      title: '삼성전자, HBM4 양산 돌입',
      link: 'https://example.com/articles/1',
    })
    expect(result.items[0].summary).toBe('삼성전자가 HBM4 메모리 양산에 돌입했다.')
    expect(result.items[0].summary).not.toMatch(/<|CDATA/)
    expect(result.items[0].publishedAt).toBe(
      new Date('Sun, 9 Aug 2026 15:45:00 +0900').toISOString()
    )
  })

  it('pubDate가 없으면 dc:date로 발행일을 채운다(보안뉴스 실측 패턴)', async () => {
    const xml = `<?xml version='1.0' encoding='utf-8' ?>
      <rss><channel>
        <item>
          <title>보안뉴스 &gt; 최신기사</title>
          <link>https://boannews.com/media/view.asp?idx=1</link>
          <description>요약문</description>
          <dc:date>Sun, 9 Aug 2026 15:45:00 +0900</dc:date>
        </item>
      </channel></rss>`
    stubFetch(respond(xml, 'text/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].title).toBe('보안뉴스 > 최신기사')
    expect(result.items[0].publishedAt).toBe(
      new Date('Sun, 9 Aug 2026 15:45:00 +0900').toISOString()
    )
  })

  it('타임존 없는 비표준 날짜(블로터·AI타임스 패턴)를 KST로 보정해 ISO로 만든다', async () => {
    const xml = `<rss><channel><item>
        <title>t</title><link>https://example.com/1</link>
        <description>d</description>
        <pubDate>2026-08-09 18:00:00</pubDate>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].publishedAt).toBe('2026-08-09T09:00:00.000Z')
  })

  it('월 이름 자리에 숫자를 찍는 기형 RFC 822(노컷뉴스 실측)를 일/월 순서 그대로 바로잡는다', async () => {
    // 22일차 실측(docs/press-candidates.md): "Tue, 11 08 2026 07:00:00 +0900"을 손대지 않고
    // new Date()에 넘기면 11을 월로, 08을 일로 오독해 11월 8일(미래·존재하지 않는 값)이 나온다.
    // RFC 822 필드 순서(요일, 일, 월, 연도)를 지키면 11일 8월(Aug)이 맞다.
    const xml = `<rss><channel><item>
        <title>t</title><link>https://example.com/1</link>
        <description>d</description>
        <pubDate>Tue, 11 08 2026 07:00:00 +0900</pubDate>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].publishedAt).toBe(
      new Date('2026-08-11T07:00:00+09:00').toISOString()
    )
  })

  it('CDATA로 감싸고 요일이 빠진 비표준 날짜(국민일보 실측)도 정상 파싱한다', async () => {
    // 22일차 실측: 국민일보는 <pubDate>를 <![CDATA[...]]>로 감싸고 요일 없이 "9 Aug  2026
    // 16:07:00 GMT"(달 뒤 이중 공백)를 준다. extractRawText의 CDATA 처리와 new Date()의
    // 관대한 파싱이 이미 정확히 동작하므로, 회귀를 막는 고정 테스트로만 남긴다.
    const xml = `<rss><channel><item>
        <title>t</title><link>https://example.com/1</link>
        <description>d</description>
        <pubDate><![CDATA[9 Aug  2026 16:07:00 GMT]]></pubDate>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].publishedAt).toBe('2026-08-09T16:07:00.000Z')
  })

  it('발행일 파싱에 실패해도 예외 대신 undefined로 흘린다', async () => {
    const xml = `<rss><channel><item>
        <title>t</title><link>https://example.com/1</link>
        <description>d</description>
        <pubDate>알 수 없는 날짜</pubDate>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].publishedAt).toBeUndefined()
  })

  it('CDATA 안에 남은 &apos;를 걷어낸다(I-011 — 아이뉴스24 실크롤 재현 케이스)', async () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <rss><channel>
        <item>
          <title><![CDATA[가천대, 국내 첫 &apos;AI반도체설계전문대학원&apos; 설립…10월부터 신입생 모집]]></title>
          <link>https://inews24.com/view/1</link>
          <description><![CDATA[스마트따옴표 &#8216;예시&#8217;와 숫자 참조 &#39;예시&#39;]]></description>
        </item>
      </channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].title).toBe(
      "가천대, 국내 첫 'AI반도체설계전문대학원' 설립…10월부터 신입생 모집"
    )
    expect(result.items[0].title).not.toMatch(/&apos;|&#\d+;/)
    // &#8216;·&#8217;는 목록에 없는 숫자 참조다 — 개별 치환이 아니라 일반 규칙으로 잡히는지 확인한다.
    expect(result.items[0].summary).toBe('스마트따옴표 ‘예시’와 숫자 참조 \'예시\'')
  })

  it('이중 이스케이프(&amp;apos; 등)는 한 번만 풀리고 따옴표로 재해석되지 않는다', async () => {
    // 순서 함정: &amp;를 먼저 풀면 그 결과로 생긴 '&apos;'가 다음 단계에서 다시 걸려 원문에
    // 없던 작은따옴표가 생긴다. 예전에는 &amp;를 맨 마지막에 처리해 이 방향만 막았고, 반대
    // 방향(숫자 참조가 되살린 &)은 그대로 뚫려 있었다 — 그게 I-043이다. 지금은 스캔이 한 번뿐이라
    // 양방향 모두 성립하지 않는다.
    const xml = `<rss><channel><item>
        <title><![CDATA[가격 &amp;apos;5000&amp;apos; 원, 코드 &amp;#39;A&amp;#39;, &amp;amp;amp;]]></title>
        <link>https://example.com/1</link>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    // 한 번만 풀렸다면 '&apos;'·'&#39;'·'&amp;'가 리터럴 텍스트로 그대로 남아야 한다.
    expect(result.items[0].title).toBe(
      "가격 &apos;5000&apos; 원, 코드 &#39;A&#39;, &amp;amp;"
    )
    // 잘못 풀리면 여기서 작은따옴표(')가 생긴다 — 원문엔 없던 문자다.
    expect(result.items[0].title).not.toContain("'")
  })

  /**
   * I-043 회귀 방어. 위 테스트의 거울상이다 — `&amp;`가 아니라 **숫자 참조**로 이스케이프한 `&`가
   * 뒤 단계에서 다시 엔티티로 스캔되던 경로다. `&apos;` 하나로 좁혀 읽으면 안 된다: 이름 표의
   * 다섯 개가 전부 같은 경로로 재해석됐다.
   */
  it.each([
    ['&#38;apos;', '&apos;'],
    ['&#x26;apos;', '&apos;'],
    ['&#38;lt;script&#38;gt;', '&lt;script&gt;'],
    ['&#38;nbsp;', '&nbsp;'],
    ['&#38;quot;', '&quot;'],
    ['&#38;amp;', '&amp;'],
  ])('숫자 참조가 되살린 &가 다시 엔티티로 재해석되지 않는다: %s (I-043)', async (raw, expected) => {
    const xml = `<rss><channel><item>
        <title><![CDATA[${raw}]]></title>
        <link>https://example.com/1</link>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    // 숫자 참조는 한 번 풀려 '&'가 되고, 그 뒤에 붙은 엔티티 모양 문자열은 원문 그대로 남아야 한다.
    expect(result.items[0].title).toBe(expected)
  })

  it('16진·10진 숫자 참조와 이름 있는 엔티티가 한 문자열에 섞여도 각각 한 번씩만 풀린다', async () => {
    const xml = `<rss><channel><item>
        <title><![CDATA[&#x27;a&#39;b&apos;c&amp;d&#38;quot;]]></title>
        <link>https://example.com/1</link>
      </item></channel></rss>`
    stubFetch(respond(xml, 'application/xml'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].title).toBe(`'a'b'c&d&quot;`)
  })

  it('헤더 charset보다 XML 선언의 encoding이 우선한다(작은따옴표 선언 포함)', async () => {
    // 헤더는 us-ascii(단일 바이트 디코더)라고 거짓 주장하지만 선언은 utf-8이다.
    // 선언이 이기지 못하면 한글 멀티바이트가 mojibake로 깨져 아래 기대값과 어긋난다.
    const xml = `<?xml version='1.0' encoding='utf-8' ?><rss><channel><item><title>보안뉴스</title><link>https://example.com/1</link></item></channel></rss>`
    stubFetch(respond(xml, 'text/xml; charset=us-ascii'))

    const result = await fetchFeed('https://example.com/feed.xml')

    assertOk(result)
    expect(result.items[0].title).toBe('보안뉴스')
  })
})

describe('fetchFeed — Atom', () => {
  it('entry를 RSS와 같은 FeedItem 형태로 정규화한다', async () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <feed>
        <entry>
          <title>D2 기술 블로그 글</title>
          <link rel="self" href="https://d2.naver.com/self"/>
          <link rel="alternate" href="https://d2.naver.com/helloworld/1"/>
          <content type="html"><![CDATA[<p>본문 <b>전문</b>이다.</p>]]></content>
          <updated>2026-08-05T14:12:35Z</updated>
        </entry>
      </feed>`
    stubFetch(respond(xml, 'application/atom+xml'))

    const result = await fetchFeed('https://example.com/feed.atom')

    assertOk(result)
    expect(result.items).toHaveLength(1)
    // link는 텍스트가 아니라 rel="alternate" href 속성에서 온다.
    expect(result.items[0].link).toBe('https://d2.naver.com/helloworld/1')
    expect(result.items[0].summary).toBe('본문 전문 이다.')
    expect(result.items[0].publishedAt).toBe('2026-08-05T14:12:35.000Z')
  })

  it('summary가 없으면 content로 대체한다(네이버 D2 실측 패턴)', async () => {
    const xml = `<feed><entry>
        <title>t</title>
        <link rel="alternate" href="https://example.com/1"/>
        <content type="html">본문만 있음</content>
        <updated>2026-08-05T14:12:35Z</updated>
      </entry></feed>`
    stubFetch(respond(xml, 'application/atom+xml'))

    const result = await fetchFeed('https://example.com/feed.atom')

    assertOk(result)
    expect(result.items[0].summary).toBe('본문만 있음')
  })
})

describe('fetchFeed — 내성(비XML·접근 불가·타임아웃)', () => {
  it('XML이 아닌 응답(HTML 404 페이지 등)에서 예외를 던지지 않고 실패 값을 돌려준다', async () => {
    stubFetch(respond('<html><body>Not Found</body></html>', 'text/html', 404))

    const result = await fetchFeed('https://example.com/missing')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/404/)
  })

  it('rss도 feed도 아닌 XML 응답을 형식 불일치 실패 값으로 돌려준다', async () => {
    stubFetch(respond('<html><body>no feed here</body></html>', 'text/html'))

    const result = await fetchFeed('https://example.com/not-a-feed')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/RSS 2.0 또는 Atom/)
  })

  it('접근 불가 URL(네트워크 오류)에서 실패 값을 돌려준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      })
    )

    const result = await fetchFeed('https://unreachable.example.com/feed.xml')

    expect(result.ok).toBe(false)
  })

  it('타임아웃되면 실패 값을 돌려준다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            })
          })
      )
    )

    const pending = fetchFeed('https://slow.example.com/feed.xml')
    await vi.runAllTimersAsync()
    const result = await pending

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/시간 초과/)
  })

  it('실패해도 프로세스가 죽지 않고 항상 값을 반환한다(예외를 던지지 않는다)', async () => {
    stubFetch(respond('not xml at all', 'text/plain', 500))

    await expect(fetchFeed('https://example.com/broken')).resolves.toMatchObject({ ok: false })
  })
})
