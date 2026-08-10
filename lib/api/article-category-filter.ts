import type { PressCategory } from '@/lib/types/press'

/**
 * `GET /api/runs/{runId}/articles`·`/keywords`의 category 필터 판정 규칙.
 * 라우트 안에 인라인으로 짜지 않고 순수 함수로 뺀 것은 `matchesArticleQuery`(article-search.ts)와
 * 같은 이유다 — vitest 회귀 대상으로 남긴다(docs/CONVENTIONS.md §9).
 *
 * 필터가 없으면 전부 통과한다. 필터가 있으면 요청한 카테고리와 정확히 일치하는 기사만
 * 통과시킨다 — **카테고리 값이 없는 기사(미상)는 필터가 걸리면 제외한다(팀장 판정으로 뒤집힘,
 * 21일차).**
 *
 * 처음에는 반대로 구현했다(값 없으면 통과) — 근거는 "Task 027 전까지는 모든 기사가 undefined라,
 * 배제하면 카테고리 필터를 하나라도 걸 때마다 결과가 통째로 비어 '고장났다'고 오인한다"였다.
 * 팀장이 이를 뒤집었다: 그 논증이 비교한 두 단점의 성격이 다르다 — 배제안의 단점은 **한시적**
 * (027 전까지만 0건)인데, 통과안의 단점은 **영구적**이다. 027이 값을 채운 뒤에도 그 이전에
 * 수집된 과거 기사는 영원히 `category: undefined`로 남고, 통과 규칙 아래서는 **모든 카테고리
 * 필터에 계속 새어 들어간다** — 「스포츠」를 골랐는데 랭킹에 과거 IT 기사 키워드가 섞여도 사용자가
 * 알아챌 방법이 없다. 이건 이 프로젝트가 vitest 대상으로 못박은 바로 그 부류다("틀려도 화면이
 * 멀쩡해 보이는 로직", CONVENTIONS §9). 같은 날 I-040에서 정반대 방향(모르는 값을 0으로 확정하지
 * 않고 undefined로 남겨 화면이 단정하지 않게 한 것)으로 이미 확립한 원칙과도 이 판정이 맞는다 —
 * "모름"을 "통과(=이 카테고리에 속한다)"로 확정하는 것도 같은 종류의 단정이었다.
 *
 * **"고장났다"는 오인은 배제 대신 `uncategorizedCount`로 막는다** — 필터 때문에 빠진 카테고리
 * 미상 기사 수를 응답에 실어(`app/api/runs/[runId]/articles/route.ts`·
 * `lib/keyword/analyze-run.ts`) 화면이 "카테고리 미상 N건은 제외했습니다"를 보여줄 수 있게 한다.
 * 조용히 0건을 주는 것과 이유를 말하며 0건을 주는 것은 다르다.
 */
export function matchesCategoryFilter(
  articleCategory: PressCategory | undefined,
  filter: PressCategory[] | undefined
): boolean {
  if (!filter || filter.length === 0) return true
  if (articleCategory === undefined) return false
  return filter.includes(articleCategory)
}
