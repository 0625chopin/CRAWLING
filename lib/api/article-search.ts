/**
 * `GET /api/runs/[runId]/articles?q=` 검색 필터(docs/ROADMAP.md Task 017 구현 규칙 "검색은
 * 파일명·제목 대상, 대소문자 무시"). 라우트 안에 인라인으로 짜지 않고 순수 함수로 뺀 것은
 * vitest 회귀 대상으로 남기기 위해서다(docs/CONVENTIONS.md §9) — 대소문자 무시·빈 검색어
 * 처리는 화면만 봐서는 틀렸는지 알 수 없는 종류다.
 */

export interface SearchableArticleEntry {
  fileName: string
  title: string
}

/** 검색어가 비어 있으면(공백만 있어도) 전체를 통과시킨다 — 빈 Input은 "검색 중 아님"과 같다. */
export function matchesArticleQuery(entry: SearchableArticleEntry, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return true

  return (
    entry.fileName.toLowerCase().includes(normalized) ||
    entry.title.toLowerCase().includes(normalized)
  )
}
