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

interface KeywordAccumulator {
  posTag: PosTag
  count: number
}

/**
 * run 전체 기사 본문으로 빈도 집계와 AnalysisSummary를 함께 산출한다.
 *
 * 기사 배열을 받아 **하나씩 순회하며** 토큰화한다 — 전체를 한 문자열로 이어 붙이면 기사
 * 수백 건에서 메모리가 급증한다(docs/ROADMAP.md Task 020 구현 규칙).
 *
 * stopwordExcludedCount는 filterKeywordTokens(020A)를 불용어 없이/있이 두 번 불러 그 차이로
 * 구한다 — POS·길이 필터 로직을 여기서 다시 구현하지 않기 위해서다. 안 그러면 extract.ts의
 * 필터 규칙이 바뀔 때 이 파일도 따로 맞춰야 하는 중복이 생긴다.
 */
export async function aggregateKeywords(
  runId: string,
  articleContents: readonly string[],
  stopwords: ReadonlySet<string>
): Promise<AggregateResult> {
  let totalTokenCount = 0
  let filteredTokenCount = 0
  let stopwordExcludedCount = 0
  const counts = new Map<string, KeywordAccumulator>()

  for (const content of articleContents) {
    const tokens = await safeTokenize(content)
    totalTokenCount += tokens.length
    filteredTokenCount += tokens.filter(
      (token) => !REMOVED_FOR_SUMMARY_TAGS.has(token.tag)
    ).length

    const beforeStopwords = filterKeywordTokens(tokens, new Set())
    const afterStopwords = filterKeywordTokens(tokens, stopwords)
    stopwordExcludedCount += beforeStopwords.length - afterStopwords.length

    for (const candidate of afterStopwords) {
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
