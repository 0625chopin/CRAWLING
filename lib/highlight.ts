/**
 * 검색어 하이라이트(Task 029)용 순수 함수. `components/results/highlighted-text.tsx`가 이
 * 결과를 그대로 React 노드로 옮겨 그린다 — 문자열을 `dangerouslySetInnerHTML`로 합치지 않고
 * 배열로 쪼개 두는 이유는 기사 본문·제목이 외부 사이트에서 긁어온 문자열이라 그대로 이어 붙이면
 * XSS 경로가 되기 때문이다(팀장 판정, Task 029).
 */

export interface HighlightSegment {
  text: string
  /** true면 검색어와 일치한 구간이라 강조해야 한다. */
  matched: boolean
}

/** 검색어에 정규식 특수문자(`.` `*` `(` `[` 등)가 들어와도 리터럴로 취급되게 이스케이프한다. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * `text`를 `query`와 일치하는 구간/아닌 구간으로 순서대로 쪼갠다. 대소문자를 무시한다 —
 * 서버 검색(`lib/api/article-search.ts`의 `matchesArticleQuery`)이 대소문자 무시라 화면의
 * 하이라이트도 같은 기준이어야 어긋나 보이지 않는다.
 *
 * 검색어가 비어 있으면(공백만 있어도) 아무것도 강조하지 않은 원문 그대로를 돌려준다 —
 * "검색 중 아님"과 같은 상태이기 때문이다(matchesArticleQuery와 같은 규칙).
 */
export function splitByMatch(text: string, query: string): HighlightSegment[] {
  const normalized = query.trim()
  if (normalized === '') return [{ text, matched: false }]

  const pattern = new RegExp(escapeRegExp(normalized), 'gi')
  const segments: HighlightSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), matched: false })
    }
    segments.push({ text: match[0], matched: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), matched: false })
  }
  return segments
}
