import 'server-only'

import { listArticles, readArticle } from '@/lib/storage/article-repository'
import type { KeywordsFile } from '@/lib/storage/keyword-repository'
import { hasKeywords, readKeywords, writeKeywords } from '@/lib/storage/keyword-repository'
import { getRun } from '@/lib/storage/run-repository'
import { getStopwordSet } from '@/lib/storage/stopword-repository'

import { aggregateKeywords } from './aggregate'

export interface AnalyzeRunOptions {
  /**
   * true면 캐시(`keywords.json`)가 있어도 무시하고 Kiwi를 다시 돈다. 021B의 `[재분석]` 버튼
   * (`?force=true`)이 쓰는 경로이며, 불용어를 바꾼 뒤에만 의미가 있다(docs/ROADMAP.md Task 021
   * 구현 규칙). 기본은 false — 캐시 우선이다.
   */
  force?: boolean
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

  if (!options.force && (await hasKeywords(runId))) {
    return { file: await readKeywords(runId), skippedArticleCount: 0 }
  }

  const [articleList, stopwords] = await Promise.all([
    listArticles(runId),
    getStopwordSet(),
  ])

  // 본문을 한 번에 다 이어 붙이지 않고 기사별로 순회한다(aggregate.ts와 같은 이유 — 기사
  // 수백 건에서 메모리 급증을 막는다). 개별 기사 읽기 실패는 run 전체를 무너뜨리지 않고
  // 건너뛴 수만 센다 — 조용히 삼키지도, 예외로 터뜨리지도 않는다(docs/CONVENTIONS.md §7).
  const contents: string[] = []
  let skippedArticleCount = 0
  for (const meta of articleList) {
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
    summary,
    items,
  }

  await writeKeywords(runId, file)

  return { file, skippedArticleCount }
}
