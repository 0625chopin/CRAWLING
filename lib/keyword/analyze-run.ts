import 'server-only'

import { matchesCategoryFilter } from '@/lib/api/article-category-filter'
import { listArticles, readArticle } from '@/lib/storage/article-repository'
import type { KeywordsFile } from '@/lib/storage/keyword-repository'
import {
  CURRENT_COUNT_BASIS,
  hasKeywords,
  readKeywords,
  writeKeywords,
} from '@/lib/storage/keyword-repository'
import { getRun } from '@/lib/storage/run-repository'
import { getStopwordSet } from '@/lib/storage/stopword-repository'
import type { PressCategory } from '@/lib/types/press'

import { aggregateKeywords } from './aggregate'

export interface AnalyzeRunOptions {
  /**
   * true면 캐시(`keywords.json`)가 있어도 무시하고 Kiwi를 다시 돈다. 021B의 `[재분석]` 버튼
   * (`?force=true`)이 쓰는 경로이며, 불용어를 바꾼 뒤에만 의미가 있다(docs/ROADMAP.md Task 021
   * 구현 규칙). 기본은 false — 캐시 우선이다.
   */
  force?: boolean
  /**
   * 지정하면 이 카테고리에 정확히 속한 기사만 골라 그 자리에서 다시 집계한다(Task 026). 카테고리
   * 값이 없는 기사(미상)는 제외된다(`matchesCategoryFilter` 계약, 21일차 팀장 판정으로 뒤집힘 —
   * 제외된 미상 기사 수는 `AnalyzeRunResult.uncategorizedCount`로 돌려준다).
   *
   * **`keywords.json` 캐시는 항상 run 전체 집계를 담는다는 계약이라(위 함수 docstring),
   * categories가 지정되면 캐시를 읽지도 쓰지도 않는다** — 부분집합 집계를 전체 캐시에 덮어쓰면
   * 다음 무필터 요청이 걸러진 결과를 전체 결과로 오인한다. 기사 쪽 category 값의 원천은 크롤
   * 파이프라인(Task 027)이 남기는 스냅샷이라 지금은 모든 기사가 값이 없고, 그래서 지금은
   * categories를 지정하면 사실상 전부 제외되어 빈 집계가 나온다 — 파라미터 파싱과 응답 계약을
   * 먼저 확정해 둔다.
   */
  categories?: PressCategory[]
}

export interface AnalyzeRunResult {
  file: KeywordsFile
  /**
   * 개별 기사 읽기·파싱 실패로 건너뛴 기사 수(docs/CONVENTIONS.md §7 — 조용히 삼키지 않는다).
   * 캐시를 그대로 읽어 반환한 호출(force가 아니고 캐시가 있던 경우)은 이번 호출에서 기사를
   * 하나도 다시 읽지 않았으므로 항상 0이다 — "이번 분석 과정에서 건너뛴 수"이지 누적치가
   * 아니다.
   */
  skippedArticleCount: number
  /**
   * categories 필터가 활성일 때, 카테고리 값이 없어(미상) 집계에서 제외된 기사 수(21일차 팀장
   * 판정). categories를 지정하지 않았으면 항상 0이다 — "필터 자체가 없다"와 "필터는 있는데
   * 미상이라 걸러졌다"를 구분해야 화면이 "카테고리 미상 N건은 제외했습니다"를 정확히 말할 수 있다.
   */
  uncategorizedCount: number
  /**
   * category 필터를 적용하기 **전**, 이 run에 저장된 전체 기사 수(크롤 파이프라인 교차검증
   * FAIL 해소, 21일차). `file.summary.articleCount`는 필터를 통과한 뒤의 값이라 category
   * 필터가 전부 걸러내면 0이 되는데, 그 값을 "원본 자체가 없다"는 판정에 그대로 쓰면 기사가
   * 실제로 있는 run에도 `keywords-response.ts`의 빈 실행 메시지가 잘못 뜬다 — 이 필드가 그
   * 오판을 막는 진짜 기준이다.
   *
   * 캐시 적중 경로(무필터 + 캐시 있음)는 캐시가 항상 run 전체(무필터) 집계라는 계약이므로
   * `file.summary.articleCount`를 그대로 쓴다 — `listArticles`를 다시 부르는 비용을 들이지
   * 않는다. 새로 집계하는 경로는 category 필터로 걸러내기 **전**의 `articleList.length`를 쓴다.
   */
  sourceArticleCount: number
}

/**
 * run 하나를 분석해 `keywords.json`을 채우거나 기존 캐시를 반환한다. 021B(`GET
 * /api/runs/[runId]/keywords`)가 부르는 단일 진입점이다 — "캐시 부재 시 자동 분석"과 "?force=true
 * 재분석"을 이 함수 하나로 표현한다(docs/ROADMAP.md Task 021 구현 규칙 "캐시와 재분석의 경계").
 *
 * **캐시가 담는 것**: 불용어·1글자 필터까지 적용한 전체 집계다. 최소 등장 횟수(`minCount`)·
 * 품사(`pos`)·`topN`은 여기서 자르지 않는다 — 그 필터는 021B가 이 결과 위에서 매 요청마다
 * 다시 적용한다. 여기서 미리 잘라 저장하면 021B가 넓은 조건으로 되돌릴 방법이 없어진다.
 *
 * 존재하지 않는 runId는 `getRun`이 던지는 `RunNotFoundError`(lib/storage/run-repository.ts,
 * D-022가 확정한 전용 타입)를 그대로 흘려보낸다 — 문자열 메시지로 판정하게 만들지 않는다
 * (I-016·D-022와 같은 원칙). **기사 0건인 run은 예외가 아니다** — `aggregateKeywords`가 빈
 * 배열을 받아도 모든 수치가 0인 정상 `AnalysisSummary`를 돌려주므로(020B), 이 함수는 그 결과를
 * 그대로 `keywords.json`에 기록하고 반환한다. 즉 "없는 run"은 예외로, "0건인 run"은 정상
 * 반환값(`items: []`)으로 갈린다 — 021B가 각각 404 / "빈 결과 + 안내"로 매핑하기만 하면 된다.
 */
export async function analyzeRun(
  runId: string,
  options: AnalyzeRunOptions = {}
): Promise<AnalyzeRunResult> {
  // run 자체가 없으면 캐시 유무를 따질 것도 없다 — 여기서 먼저 존재를 확인해 RunNotFoundError로
  // 던지게 한다(app/api/runs/*의 기존 라우트들과 같은 순서).
  await getRun(runId)

  // categories가 지정되면 run 전체 캐시로는 답할 수 없다(부분집합 집계) — force와 무관하게
  // 항상 새로 계산하고, 그 결과를 keywords.json에 쓰지도 않는다(위 AnalyzeRunOptions.categories
  // docstring).
  const categoryFilterActive = (options.categories?.length ?? 0) > 0

  if (!categoryFilterActive && !options.force && (await hasKeywords(runId))) {
    const cached = await readKeywords(runId)
    // countBasis가 없거나 다른 파일은 **옛 기준(총 등장 횟수)으로 집계된 캐시**다 — 숫자 모양이
    // 같아서 그대로 쓰면 랭킹이 조용히 틀린다(keyword-repository.ts의 countBasis 주석).
    // 캐시 미스와 똑같이 처리해 아래에서 다시 집계하고 덮어쓴다.
    if (cached.countBasis === CURRENT_COUNT_BASIS) {
      return {
        file: cached,
        skippedArticleCount: 0,
        uncategorizedCount: 0,
        sourceArticleCount: cached.summary.articleCount,
      }
    }
  }

  const [articleList, stopwords] = await Promise.all([
    listArticles(runId),
    getStopwordSet(),
  ])
  // category 필터로 걸러내기 전의 원본 개수 — 위 AnalyzeRunResult.sourceArticleCount docstring 참고.
  const sourceArticleCount = articleList.length

  // 미상(category: undefined)은 필터가 활성이면 matchesCategoryFilter가 false를 준다(21일차
  // 판정) — 그 제외분을 조용히 삼키지 않고 별도로 세어 응답에 실을 수 있게 한다.
  const uncategorizedCount = categoryFilterActive
    ? articleList.filter((meta) => meta.category === undefined).length
    : 0

  const targetArticles = categoryFilterActive
    ? articleList.filter((meta) => matchesCategoryFilter(meta.category, options.categories))
    : articleList

  // 본문을 한 번에 다 이어 붙이지 않고 기사별로 순회한다(aggregate.ts와 같은 이유 — 기사
  // 수백 건에서 메모리 급증을 막는다). 개별 기사 읽기 실패는 run 전체를 무너뜨리지 않고
  // 건너뛴 수만 센다 — 조용히 삼키지도, 예외로 터뜨리지도 않는다(docs/CONVENTIONS.md §7).
  const contents: string[] = []
  let skippedArticleCount = 0
  for (const meta of targetArticles) {
    try {
      const article = await readArticle(runId, meta.id)
      contents.push(article.content)
    } catch (error) {
      skippedArticleCount += 1
      console.warn(`[analyze-run] 기사 읽기 실패로 건너뜁니다: ${runId}/${meta.id}`, error)
    }
  }

  const { summary, items } = await aggregateKeywords(runId, contents, stopwords)
  const file: KeywordsFile = {
    runId,
    analyzedAt: new Date().toISOString(),
    countBasis: CURRENT_COUNT_BASIS,
    summary,
    items,
  }

  if (!categoryFilterActive) {
    await writeKeywords(runId, file)
  }

  return { file, skippedArticleCount, uncategorizedCount, sourceArticleCount }
}
