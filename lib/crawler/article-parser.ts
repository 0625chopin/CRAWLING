import 'server-only'

import type { ContentSource } from '@/lib/types/article'

import type { LoadedDocument } from './parse'

/**
 * ⚠️ 본문에는 `parse.ts`의 `selectText`를 쓰지 않는다. `selectText`는 `.replace(/\s+/g, ' ')`로
 * 문단 개행까지 한 칸 공백으로 접어 제목에는 맞지만 본문에 쓰면 기사 전체가 한 줄이 된다.
 * 개행이 뭉개진 채 txt로 저장되면 원본 HTML이 없어 재크롤 외에 되돌릴 수단이 없다
 * (ROADMAP Task 013A 구현 규칙). 이 파일은 문단(`<p>`) 단위로 텍스트를 모아 그 사이만
 * `\n\n`으로 이어 붙여 개행을 보존한다.
 */

/** 화면에 보이지 않거나 본문이 아닌 요소. 텍스트로 뽑히면 스크립트 코드가 그대로 섞여 들어온다. */
const NOISE_TAG_SELECTOR = 'script, style, noscript, iframe, form, ins'

/**
 * 광고 위젯을 가리키는 흔한 class/id 조각. `docs/press-candidates.md`가 실측한 언론사들의
 * 광고 셀렉터까지는 확인하지 못했으므로("미확인·미해결" 참고) 과신하지 않는 최소한의 휴리스틱이다.
 * 오탐이 걱정되는 이유로 CSS 대소문자무시 속성 선택자(`[class*="ad" i]`) 대신 직접 문자열 검사를 쓴다.
 */
const AD_MARKER_PATTERN = /(^|[-_\s])(ad|ads|advert|banner|sponsor)([-_\s]|$)/i

function normalizeParagraph(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * `contentSelector`가 가리키는 영역에서 본문을 문단 개행을 보존한 채 추출한다.
 *
 * `contentSelector`는 두 형태로 온다(`docs/press-candidates.md` 실측 두 사례):
 * - 컨테이너 하나(예: `#articleBody`) — 그 안의 `<p>` 자손이 문단이다.
 * - 이미 `<p>` 단위(예: `#articleBody > p`) — 매칭된 요소 자체가 문단이다.
 *
 * 둘 다 아니고 `<p>`가 하나도 없으면(사진 기사 등 구조가 다른 경우) 컨테이너 전체 텍스트를
 * 한 문단으로 취급한다 — 이 경우 개행은 보존되지 않지만 빈 본문보다는 낫다.
 */
export function extractArticleContent($: LoadedDocument, contentSelector: string): string {
  const matched = $(contentSelector)
  if (matched.length === 0) return ''

  const scope = matched.clone()
  scope.find(NOISE_TAG_SELECTOR).remove()
  // 광고 위젯은 태그가 아니라 class/id로만 구분되므로 순회하며 마커를 직접 검사한다.
  scope.find('*').each((_, el) => {
    const node = $(el)
    const marker = `${node.attr('class') ?? ''} ${node.attr('id') ?? ''}`
    if (AD_MARKER_PATTERN.test(marker)) node.remove()
  })

  const paragraphElements = scope.filter('p').length > 0 ? scope.filter('p') : scope.find('p')

  const paragraphs =
    paragraphElements.length > 0
      ? paragraphElements.map((_, el) => normalizeParagraph($(el).text())).get()
      : [normalizeParagraph(scope.text())]

  return paragraphs.filter((text) => text.length > 0).join('\n\n')
}

/** RSS 요약 경로는 원문 페이지를 열지 않으므로 하한을 낮춘다(ROADMAP Task 013A 구현 규칙). */
const MIN_CONTENT_LENGTH: Record<ContentSource, number> = {
  'article-page': 100,
  'rss-summary': 50,
}

/**
 * 본문 검사 결과. 실패를 예외로 던지지 않고 값으로 격리한다
 * (`CrawlFailure` 패턴, `lib/crawler/types.ts` · `docs/CONVENTIONS.md` §7).
 * 기사 1건의 검사 실패가 언론사 전체나 실행 전체를 무너뜨리면 안 된다.
 */
export type ArticleContentCheck =
  | { ok: true; content: string }
  | { ok: false; reason: string }

/** 본문(또는 RSS 요약)이 출처별 최소 길이를 만족하는지 값으로 판정한다. */
export function checkArticleContent(
  content: string,
  source: ContentSource
): ArticleContentCheck {
  const trimmed = content.trim()
  const minLength = MIN_CONTENT_LENGTH[source]

  if (trimmed.length < minLength) {
    return {
      ok: false,
      reason: `본문 길이가 최소 기준(${minLength}자) 미만입니다 (${trimmed.length}자)`,
    }
  }

  return { ok: true, content: trimmed }
}

/** 언론사당 수집 기사 수 기본값·상한(ROADMAP Task 013A 구현 규칙, 화면 설계서 01 §③). */
export const DEFAULT_MAX_ARTICLES_PER_PRESS = 20
export const MAX_ARTICLES_PER_PRESS = 100

/**
 * 요청값을 상한 안으로 자른다. 값이 없으면 기본값을, 1 미만이면 1을 쓴다.
 * 오케스트레이터(Task 013B)가 목록에서 추출한 링크를 이 개수로 자른 뒤 기사 크롤에 들어간다.
 */
export function resolveMaxArticlesPerPress(requested: number | undefined): number {
  if (requested === undefined) return DEFAULT_MAX_ARTICLES_PER_PRESS
  return Math.min(Math.max(1, Math.trunc(requested)), MAX_ARTICLES_PER_PRESS)
}
