import * as cheerio from 'cheerio'

export type LoadedDocument = cheerio.CheerioAPI

/** HTML 문자열을 cheerio 문서로 로드한다. */
export function loadDocument(html: string): LoadedDocument {
  return cheerio.load(html)
}

/** 셀렉터에 매칭되는 첫 요소의 텍스트를 공백 정리해서 반환한다. */
export function selectText(
  $: LoadedDocument,
  selector: string
): string | undefined {
  const text = $(selector).first().text().trim()
  return text.length > 0 ? text.replace(/\s+/g, ' ') : undefined
}

/** 셀렉터에 매칭되는 모든 요소의 텍스트를 배열로 반환한다. 빈 값은 제외한다. */
export function selectAllText($: LoadedDocument, selector: string): string[] {
  return $(selector)
    .map((_, element) => $(element).text().trim().replace(/\s+/g, ' '))
    .get()
    .filter((text) => text.length > 0)
}

/** 셀렉터에 매칭되는 첫 요소의 속성값을 반환한다. */
export function selectAttr(
  $: LoadedDocument,
  selector: string,
  attribute: string
): string | undefined {
  return $(selector).first().attr(attribute)
}

/**
 * 문서 안의 링크를 baseUrl 기준 절대 URL로 정규화해 중복 없이 반환한다.
 * 앵커(#)와 javascript:, mailto: 같은 비-HTTP 스킴은 걸러낸다.
 */
export function extractLinks(
  $: LoadedDocument,
  baseUrl: string,
  selector = 'a[href]'
): string[] {
  const links = new Set<string>()

  $(selector).each((_, element) => {
    const href = $(element).attr('href')
    if (!href || href.startsWith('#')) return

    try {
      const resolved = new URL(href, baseUrl)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        resolved.hash = ''
        links.add(resolved.toString())
      }
    } catch {
      // 파싱 불가능한 href는 조용히 건너뛴다.
    }
  })

  return [...links]
}

/** <meta> 태그를 name/property 키로 모아 반환한다. OG 태그 수집에 사용한다. */
export function extractMeta($: LoadedDocument): Record<string, string> {
  const meta: Record<string, string> = {}

  $('meta').each((_, element) => {
    const key = $(element).attr('property') ?? $(element).attr('name')
    const content = $(element).attr('content')
    if (key && content) meta[key] = content
  })

  return meta
}
