import 'server-only'

import { XMLParser } from 'fast-xml-parser'

import { crawlerConfig } from './config'
import type { CrawlFailure } from './types'

/**
 * RSS 2.0과 Atom을 정규화한 표준 형태. 호출부(Task 013B의 오케스트레이터, 소스 테스트 API)는
 * 원본 피드가 어느 형식이었는지 몰라도 된다(ROADMAP Task 010A).
 */
export interface FeedItem {
  title: string
  link: string
  /** HTML 태그·CDATA 잔여물을 걷어낸 평문. */
  summary: string
  /** ISO 8601 문자열. 발행일 파싱에 실패하면 undefined로 흘린다(예외 대신 값으로, docs/CONVENTIONS.md §7). */
  publishedAt: string | undefined
}

const DEFAULT_CHARSET = 'utf-8'

/** fast-xml-parser 파싱 결과에서 태그 값이 취할 수 있는 형태들. */
type XmlNodeValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | XmlNodeValue[]
  | { [key: string]: XmlNodeValue }

interface AtomLinkNode {
  '@_href'?: string
  '@_rel'?: string
}

/** 언제나 배열로 다룬다 — fast-xml-parser는 자식이 1개면 배열이 아니라 단일 객체를 준다. */
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * 태그 값에서 순수 문자열을 뽑아낸다. `cdataPropName: '__cdata'`로 파싱했으므로
 * CDATA 구간은 `{ __cdata, '#text' }` 형태로 분리돼 들어올 수 있다.
 */
function extractRawText(value: XmlNodeValue): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(extractRawText).join('')

  const node = value
  const parts: string[] = []
  if ('__cdata' in node) parts.push(extractRawText(node.__cdata))
  if ('#text' in node) parts.push(extractRawText(node['#text']))
  return parts.join('')
}

/**
 * 이름 있는 엔티티 중 실제 피드에서 나타난 것만 유지한다. `cdataPropName`으로 분리된 CDATA
 * 구간은 fast-xml-parser가 절대 엔티티로 해석하지 않는다(XML 스펙상 CDATA는 리터럴이고,
 * 라이브러리 소스로도 확인했다 — `OrderedObjParser.js`가 CDATA 값은 `parseTextData`를 거치지
 * 않은 원본 `tagExp` 그대로 저장한다) — 그래서 `htmlEntities: true` 같은 파서 옵션을 켜도
 * CDATA 안의 `&apos;`는 그대로 남는다(I-011 재현으로 직접 확인). 태그 밖 일반 텍스트는 파서가
 * 이미 처리하므로, 여기서는 CDATA에서 살아남은 잔여물만 상대하면 된다.
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  // `&amp;`도 같은 표에 둔다. 예전에는 "다른 단계가 되살린 &가 다시 걸리지 않도록" 별도 replace로
  // 맨 마지막에 처리했는데, 스캔이 한 번으로 줄면서 그 순서 규칙 자체가 필요 없어졌다(I-043).
  amp: '&',
}

/**
 * 숫자 참조(`&#39;`·`&#8217;` 등)는 코드가 하나씩 나타날 때마다 치환 목록에 추가하는 방식으로는
 * 감당할 수 없다 — `&#8216;`·`&#8217;`(스마트 따옴표) 다음엔 다른 코드가 또 나올 뿐이다. 십진·
 * 16진 숫자 참조는 코드 포인트 하나의 규칙으로 전부 잡히므로, 이 두 정규식이 "아직 안 드러난"
 * 숫자 참조 전체를 미리 막는다. 이름 있는 엔티티는 실제로 관측된 것만 위 표에 최소로 둔다.
 * `@nodable/entities`(fast-xml-parser가 내부적으로 쓰는 전체 이름 표)는 `package.json`에
 * 선언되지 않은 전이 의존성이라 직접 import하지 않는다(docs/CONVENTIONS.md §3, nanoid와 같은 이유).
 *
 * **반드시 한 번의 스캔으로 끝낸다(I-043).** 예전에는 16진 → 10진 → 이름 → `&amp;` 순으로
 * `.replace()`를 네 번 돌렸는데, 앞 단계가 되살린 `&`를 뒤 단계가 원문의 일부인 것처럼 다시
 * 스캔해 `&#38;apos;`가 `'`로 이중 디코딩됐다 — `&apos;`만이 아니라 표의 다섯 개가 전부 같은
 * 경로였다. `&amp;`를 마지막에 두는 기존 보호는 숫자 참조 쪽을 막지 못하고, 숫자 참조와 이름
 * 있는 엔티티가 서로를 되살릴 수 있어 **순서를 어떻게 바꿔도 반대쪽이 뚫린다.** 스캔 횟수를
 * 하나로 줄이는 것만이 답이다 — `String.replace`는 같은 호출 안에서 치환 결과를 다시 스캔하지
 * 않으므로 재해석 경로가 원천적으로 사라진다.
 */
function decodeHtmlEntities(raw: string): string {
  return raw.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|(nbsp|lt|gt|quot|apos|amp));/gi,
    (match: string, hex?: string, dec?: string, name?: string) => {
      if (hex !== undefined) return fromCodePoint(Number.parseInt(hex, 16), match)
      if (dec !== undefined) return fromCodePoint(Number.parseInt(dec, 10), match)
      return name === undefined ? match : (NAMED_ENTITIES[name.toLowerCase()] ?? match)
    }
  )
}

/** 잘못된 숫자 참조(범위 밖 코드 포인트)는 원문을 그대로 남긴다 — 아래 `isValidCodePoint` 참고. */
function fromCodePoint(code: number, fallback: string): string {
  return isValidCodePoint(code) ? String.fromCodePoint(code) : fallback
}

/** 잘못된 숫자 참조(범위 밖 코드 포인트)로 `String.fromCodePoint`가 던지면 기사 1건이 무너진다
 * — 값으로 격리해 원문을 그대로 남긴다(docs/CONVENTIONS.md §7). */
function isValidCodePoint(code: number): boolean {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
}

/**
 * 태그·CDATA 마커·HTML 엔티티를 걷어내 평문으로 만든다.
 * 피드 요약에는 `<![CDATA[...]]>`와 `<img>`·`<a>`가 흔히 섞여 있고,
 * 그대로 두면 키워드 집계에 태그 조각이 들어간다(ROADMAP Task 010A 구현 규칙).
 */
function toPlainText(raw: string): string {
  return decodeHtmlEntities(
    raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 노컷뉴스 계열 피드는 `<pubDate>`에서 월 이름 자리에 숫자를 그대로 찍는다
 * (`"Tue, 11 08 2026 07:00:00 +0900"` — RFC 822라면 두 번째 자리에 `Aug`가 와야 한다,
 * 22일차 `docs/press-candidates.md` 실측). 이 문자열을 그대로 `new Date()`에 넘기면 V8이
 * 첫 번째 숫자를 월로, 두 번째 숫자를 일로 오독해 11월 8일이라는 **존재하지 않는 오늘 이후
 * 날짜를 "유효한" 값으로 돌려준다** — `Number.isNaN` 검사로는 못 잡는 조용한 오파싱이다
 * (직접 재현: `new Date("Tue, 11 08 2026 07:00:00 +0900")` → `2026-11-07T22:00:00.000Z`,
 * 실제로는 8월 11일 기사였다). RFC 822의 필드 순서(요일, **일**, 월, 연도)를 그대로 쓰되
 * 월 자리만 숫자로 잘못 찍은 형태이므로, 일/월 자리를 명시적으로 고정해 이 정규식으로 먼저
 * 잡은 뒤에만 `Date`로 넘긴다.
 */
const MALFORMED_NUMERIC_MONTH_PATTERN =
  /^\w{3},\s*(\d{1,2})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{2})(\d{2})$/

function normalizeMalformedNumericMonth(trimmed: string): string | undefined {
  const match = trimmed.match(MALFORMED_NUMERIC_MONTH_PATTERN)
  if (!match) return undefined
  const [, day, month, year, time, tzHour, tzMinute] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) {
    return undefined
  }
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}${tzHour}:${tzMinute}`
}

/**
 * RFC 822·ISO 8601·"YYYY-MM-DD HH:mm:ss"(타임존 없음) 세 형식을 실제 피드에서 확인했다
 * (docs/press-candidates.md §표에서 놓치면 안 되는 것). 타임존이 없는 값은 이 도구의 대상이
 * 전부 국내 언론사라는 전제로 KST(+09:00)를 붙인다. 위 「월 자리 숫자」 기형 형식은 일반
 * 경로로 넘기기 전에 먼저 바로잡는다. 그래도 파싱에 실패하면 예외 대신 undefined로 흘린다 —
 * 발행일 하나 때문에 피드 전체 파싱이 죽으면 안 된다.
 */
function parsePublishedAt(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const withoutTimezone = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/)
  const normalized = withoutTimezone
    ? `${withoutTimezone[1]}T${withoutTimezone[2]}+09:00`
    : (normalizeMalformedNumericMonth(trimmed) ?? trimmed)

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

/** Atom `<link>`은 rel별로 여러 개 올 수 있다. 링크 텍스트가 아니라 href 속성이다. */
function extractAtomLink(linkField: XmlNodeValue): string {
  const links = toArray(linkField as AtomLinkNode | AtomLinkNode[] | undefined).filter(
    (link): link is AtomLinkNode => typeof link === 'object' && link !== null
  )
  const alternate = links.find((link) => !link['@_rel'] || link['@_rel'] === 'alternate')
  return (alternate ?? links[0])?.['@_href']?.trim() ?? ''
}

interface RssItemNode {
  title?: XmlNodeValue
  link?: XmlNodeValue
  description?: XmlNodeValue
  pubDate?: XmlNodeValue
  'dc:date'?: XmlNodeValue
}

/** RSS 2.0은 `<item>`/`<pubDate>`/`<description>`, 날짜는 매체에 따라 `<dc:date>`로 대신 온다. */
function normalizeRssItem(item: RssItemNode): FeedItem {
  const publishedRaw = extractRawText(item.pubDate) || extractRawText(item['dc:date'])
  return {
    title: toPlainText(extractRawText(item.title)),
    link: extractRawText(item.link).trim(),
    summary: toPlainText(extractRawText(item.description)),
    publishedAt: parsePublishedAt(publishedRaw),
  }
}

interface AtomEntryNode {
  title?: XmlNodeValue
  link?: XmlNodeValue
  summary?: XmlNodeValue
  content?: XmlNodeValue
  updated?: XmlNodeValue
}

/**
 * Atom은 `<entry>`/`<updated>`, 요약은 `<summary>`가 없을 수 있다 — 네이버 D2처럼
 * `<content type="html">`에 본문 전문만 주는 피드가 실물로 확인됐다(docs/press-candidates.md).
 */
function normalizeAtomEntry(entry: AtomEntryNode): FeedItem {
  const summarySource = entry.summary !== undefined ? entry.summary : entry.content
  return {
    title: toPlainText(extractRawText(entry.title)),
    link: extractAtomLink(entry.link),
    summary: toPlainText(extractRawText(summarySource)),
    publishedAt: parsePublishedAt(extractRawText(entry.updated)),
  }
}

/**
 * `Content-Type` 헤더와 XML 선언에서 charset을 읽는다. 선언이 있으면 헤더보다 우선한다
 * (EUC-KR 피드는 헤더에 charset을 싣지 않는 경우가 흔하고, 선언은 작은따옴표로도 온다
 * — docs/press-candidates.md "표에서 놓치면 안 되는 것").
 */
function detectCharset(bytes: ArrayBuffer, contentType: string | null): string {
  // XML 선언은 항상 ASCII 범위 바이트로 시작하므로 latin1로 읽어도 선언 자체는 깨지지 않는다.
  const prolog = new TextDecoder('latin1').decode(bytes.slice(0, 200))
  const declared = prolog.match(/<\?xml[^>]*\sencoding=["']([^"']+)["']/i)?.[1]
  if (declared) return declared.trim().toLowerCase()

  const header = contentType?.match(/charset=([^;]+)/i)?.[1]
  if (header) return header.trim().toLowerCase()

  return DEFAULT_CHARSET
}

/** 알 수 없는 인코딩 라벨이면 파싱을 포기하는 대신 UTF-8로 최선을 다해 디코딩한다. */
function decodeBytes(bytes: ArrayBuffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder(DEFAULT_CHARSET).decode(bytes)
  }
}

async function fetchFeedBytes(
  feedUrl: string
): Promise<{ bytes: ArrayBuffer; contentType: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), crawlerConfig.timeoutMs)

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': crawlerConfig.userAgent },
    })

    if (!response.ok) {
      throw new Error(`피드 응답이 실패했습니다 (status: ${response.status})`)
    }

    const bytes = await response.arrayBuffer()
    return { bytes, contentType: response.headers.get('content-type') }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('피드 요청이 시간 초과되었습니다')
    }
    if (error instanceof Error && error.message.startsWith('피드 응답이 실패했습니다')) {
      throw error
    }
    throw new Error(
      `피드 요청에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

/** 바이트를 실제 `FeedItem[]`으로 만드는 내부 단계. 실패하면 던진다 — `fetchFeed`가 경계에서 값으로 바꾼다. */
function parseFeedItems(xml: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
    parseTagValue: false,
  })

  let parsed: Record<string, XmlNodeValue>
  try {
    parsed = parser.parse(xml) as Record<string, XmlNodeValue>
  } catch {
    throw new Error('RSS/Atom XML을 해석할 수 없습니다')
  }

  const rss = parsed.rss
  const channel =
    typeof rss === 'object' && rss !== null && !Array.isArray(rss)
      ? (rss as Record<string, XmlNodeValue>).channel
      : undefined
  if (typeof channel === 'object' && channel !== null && !Array.isArray(channel)) {
    const items = toArray(
      (channel as Record<string, XmlNodeValue>).item as RssItemNode | RssItemNode[] | undefined
    )
    return items.map(normalizeRssItem)
  }

  const feed = parsed.feed
  if (typeof feed === 'object' && feed !== null && !Array.isArray(feed)) {
    const entries = toArray(
      (feed as Record<string, XmlNodeValue>).entry as AtomEntryNode | AtomEntryNode[] | undefined
    )
    return entries.map(normalizeAtomEntry)
  }

  throw new Error('RSS 2.0 또는 Atom 피드 형식이 아닙니다')
}

/** 피드 하나를 통째로 읽어온 성공 결과. `lib/crawler/fetch-html.ts`의 `CrawlSuccess`와 같은 관용구(`ok`·`url`·`elapsedMs`)를 쓴다. */
export interface FeedFetchSuccess {
  ok: true
  url: string
  items: FeedItem[]
  elapsedMs: number
}

/**
 * `fetchFeed`의 반환 형태. 실패는 `lib/crawler/types.ts`의 `CrawlFailure`를 그대로 재사용한다 —
 * `fetchHtml`이 이미 "단일 URL을 열었는데 통째로 실패"를 이 값으로 표현하는 계약을 확립해 두었고
 * (`fetch-html.ts:50-56`), 013B 오케스트레이터가 RSS·HTML 두 경로를 같은 `if (result.ok)` 관용구로
 * 다룰 수 있어야 하기 때문이다(docs/CONVENTIONS.md §7 — 개별 실패는 예외가 아니라 값으로 격리한다).
 */
export type FeedFetchResult = FeedFetchSuccess | CrawlFailure

/**
 * RSS 피드 URL 하나를 받아 정규화된 `FeedItem[]`을 값으로 돌려준다.
 * 이 함수는 Playwright를 쓰지 않는다 — XML에는 JS 렌더링이 없어 fetch로 충분하다
 * (docs/PRD.md §기술 스택 "RSS 경로에 대한 두 가지 전제").
 *
 * 실패(비XML 응답·접근 불가·타임아웃)는 예외를 던지지 않고 `{ ok: false, error }` 값으로 돌려준다 —
 * 언론사 1곳의 피드 실패가 실행 전체를 무너뜨리면 안 된다는 원칙이 피드 자체의 실패에도 그대로 적용된다.
 */
export async function fetchFeed(feedUrl: string): Promise<FeedFetchResult> {
  const startedAt = Date.now()
  try {
    const { bytes, contentType } = await fetchFeedBytes(feedUrl)
    const charset = detectCharset(bytes, contentType)
    const xml = decodeBytes(bytes, charset)
    const items = parseFeedItems(xml)

    return { ok: true, url: feedUrl, items, elapsedMs: Date.now() - startedAt }
  } catch (error) {
    return {
      ok: false,
      url: feedUrl,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
    }
  }
}
