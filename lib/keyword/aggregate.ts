import 'server-only'

import type { AnalysisSummary, KeywordCount, PosTag } from '@/lib/types/keyword'

import { filterKeywordTokens } from './extract'
import { safeTokenize } from './kiwi'

/**
 * AnalysisSummary의 filteredTokenCount("조사·어미·접미사 제거 후")는 최종 키워드 필터
 * (NNG/NNP/SL + 1글자 제외 + 불용어, extract.ts)보다 느슨한 기준이다 — 동사·형용사·숫자 같은
 * 다른 품사는 그대로 남긴 채 조사·어미·접미사 3종만 뺀 값이다(docs/ROADMAP.md Task 020
 * "AnalysisSummary 5개 수치" 설명). "조사를 걷어냈다"는 것을 사용자에게 증명하는 수치이므로
 * 최종 키워드 집합(uniqueKeywordCount 쪽)과는 별도로 계산한다.
 */
const PARTICLE_TAGS = [
  'JKS',
  'JKC',
  'JKG',
  'JKO',
  'JKB',
  'JKV',
  'JKQ',
  'JX',
  'JC',
] as const
const ENDING_TAGS = ['EP', 'EF', 'EC', 'ETN', 'ETM'] as const
const SUFFIX_TAGS = ['XSN', 'XSV', 'XSA'] as const
const REMOVED_FOR_SUMMARY_TAGS = new Set<string>([
  ...PARTICLE_TAGS,
  ...ENDING_TAGS,
  ...SUFFIX_TAGS,
])

export interface AggregateResult {
  summary: AnalysisSummary
  items: KeywordCount[]
}

/**
 * 기사 1건을 분석한 결과. `keywords`는 **그 기사 안에서 중복을 제거한** 키워드 집합이다 —
 * 집계 기준이 "언급 기사 수"이므로(아래 `aggregateKeywords` 주석) 같은 기사에서 같은 단어가
 * 몇 번 나오든 1로 접는다.
 *
 * 토큰 3종(total/filtered/stopwordExcluded)은 접지 않은 **원시 토큰 개수** 그대로다. 이 셋은
 * "조사·어미를 실제로 걷어냈다"를 보여주는 수치라 서로 같은 단위(토큰)여야 뜻이 통하고,
 * 랭킹의 count와는 애초에 다른 축이다.
 */
export interface ArticleAnalysis {
  keywords: { keyword: string; posTag: PosTag }[]
  totalTokenCount: number
  filteredTokenCount: number
  stopwordExcludedCount: number
}

/**
 * 기사 본문 1건 → 중복 제거된 키워드 집합 + 토큰 수치. `aggregateKeywords`(run 단위)와
 * `lib/keyword/daily-keywords.ts`(날짜·시간대 단위)가 공유하는 단일 진입점이다 — 두 집계 경로가
 * 각자 Kiwi를 부르고 각자 중복을 접으면 한쪽만 고쳐지는 사고가 난다.
 *
 * stopwordExcludedCount는 filterKeywordTokens(020A)를 불용어 없이/있이 두 번 불러 그 차이로
 * 구한다 — POS·길이 필터 로직을 여기서 다시 구현하지 않기 위해서다. 안 그러면 extract.ts의
 * 필터 규칙이 바뀔 때 이 파일도 따로 맞춰야 하는 중복이 생긴다.
 */
export async function analyzeArticleContent(
  content: string,
  stopwords: ReadonlySet<string>
): Promise<ArticleAnalysis> {
  const tokens = await safeTokenize(content)
  const beforeStopwords = filterKeywordTokens(tokens, new Set())
  const afterStopwords = filterKeywordTokens(tokens, stopwords)

  // 같은 기사 안의 중복은 여기서 접는다. 먼저 본 토큰의 품사를 유지한다 — 같은 표기가 기사
  // 안에서 NNG와 NNP로 갈리는 경우가 있는데, 어느 쪽을 고르든 랭킹 순서는 같으므로 "처음 값"
  // 이라는 규칙 하나로 결정론을 확보하는 편이 낫다.
  const seen = new Map<string, PosTag>()
  for (const candidate of afterStopwords) {
    if (!seen.has(candidate.keyword)) {
      seen.set(candidate.keyword, candidate.posTag)
    }
  }

  return {
    keywords: [...seen.entries()].map(([keyword, posTag]) => ({ keyword, posTag })),
    totalTokenCount: tokens.length,
    filteredTokenCount: tokens.filter((token) => !REMOVED_FOR_SUMMARY_TAGS.has(token.tag)).length,
    stopwordExcludedCount: beforeStopwords.length - afterStopwords.length,
  }
}

/**
 * run 전체 기사 본문으로 빈도 집계와 AnalysisSummary를 함께 산출한다.
 *
 * **`count`는 "그 키워드를 언급한 기사 수"다 — 본문에 나온 총 등장 횟수가 아니다(23일차 이후
 * 팀장 확정).** 총 등장 횟수로 세던 시절에는 전문(`contentSource: 'article-page'`)으로 받은 긴
 * 기사 한두 건이 랭킹을 통째로 지배했다: 기사 548건짜리 실행에서 1위 "모델" 244회 중 160회가
 * 기술 블로그 2건에서 나왔고, 7위 "vLLM" 96회는 **기사 2건이 전부**였다. RSS 요약(짧음)과 원문
 * 전문(긺)이 한 실행에 섞이면 생기는 편향으로 `lib/types/article.ts`의 `contentSource`가 이미
 * 예고해 둔 것이며, "몇 개 매체가 이 키워드를 다루는가"라는 핫 키워드 본래 의미에도 기사 수가 맞는다.
 *
 * 기사 배열을 받아 **하나씩 순회하며** 토큰화한다 — 전체를 한 문자열로 이어 붙이면 기사
 * 수백 건에서 메모리가 급증한다(docs/ROADMAP.md Task 020 구현 규칙).
 */
export async function aggregateKeywords(
  runId: string,
  articleContents: readonly string[],
  stopwords: ReadonlySet<string>
): Promise<AggregateResult> {
  let totalTokenCount = 0
  let filteredTokenCount = 0
  let stopwordExcludedCount = 0
  const counts = new Map<string, { posTag: PosTag; count: number }>()

  for (const content of articleContents) {
    const analysis = await analyzeArticleContent(content, stopwords)
    totalTokenCount += analysis.totalTokenCount
    filteredTokenCount += analysis.filteredTokenCount
    stopwordExcludedCount += analysis.stopwordExcludedCount

    for (const candidate of analysis.keywords) {
      const existing = counts.get(candidate.keyword)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(candidate.keyword, { posTag: candidate.posTag, count: 1 })
      }
    }
  }

  // 정렬은 빈도 내림차순 고정, 동률은 가나다순(docs/ROADMAP.md Task 020 구현 규칙 — PRD가
  // "빈도순 랭킹"으로 정렬 기준을 고정 규정했다. press-repository.listPress와 같은 'ko' 로케일 비교를 쓴다).
  const items: KeywordCount[] = [...counts.entries()]
    .map(([keyword, { posTag, count }]) => ({ runId, keyword, posTag, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'ko'))

  const summary: AnalysisSummary = {
    articleCount: articleContents.length,
    totalTokenCount,
    filteredTokenCount,
    stopwordExcludedCount,
    uniqueKeywordCount: items.length,
  }

  return { summary, items }
}
