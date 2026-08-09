import { z } from 'zod'

/**
 * Kiwi 세종 태그셋 중 이 프로젝트가 키워드 후보로 인정하는 3종만 남긴다 — 명사(NNG/NNP)·영문(SL).
 * 조사·어미·접미사는 추출 단계(lib/keyword/extract.ts, Task 020A)에서 이미 걸러진다.
 */
export const posTagSchema = z.enum(['NNG', 'NNP', 'SL'])
export type PosTag = z.infer<typeof posTagSchema>

/** keywords.json의 items 항목. 불용어·1글자 필터까지 적용한 전체 집계를 담는다(docs/PRD.md §KeywordCount). */
export const keywordCountSchema = z.object({
  runId: z.string().min(1),
  keyword: z.string().min(1),
  posTag: posTagSchema,
  count: z.number().int().positive(),
})
export type KeywordCount = z.infer<typeof keywordCountSchema>

/** 분석 요약 5개 수치(docs/screens/03-hot-keyword.md §② 분석 요약). */
export const analysisSummarySchema = z.object({
  articleCount: z.number().int().nonnegative(),
  totalTokenCount: z.number().int().nonnegative(),
  filteredTokenCount: z.number().int().nonnegative(),
  stopwordExcludedCount: z.number().int().nonnegative(),
  uniqueKeywordCount: z.number().int().nonnegative(),
})
export type AnalysisSummary = z.infer<typeof analysisSummarySchema>

/**
 * 랭킹 표·카드가 쓰는 화면 전용 파생 뷰다. keywordCountSchema에 rank·ratio를 더한 것으로,
 * 저장 포맷(keywordCountSchema)과 분리해 정렬·비율 같은 계산값이 keywords.json에 섞이지 않게 한다.
 */
export const keywordRankItemSchema = z.object({
  rank: z.number().int().positive(),
  keyword: z.string().min(1),
  posTag: posTagSchema,
  count: z.number().int().positive(),
  ratio: z.number().min(0).max(1),
})
export type KeywordRankItem = z.infer<typeof keywordRankItemSchema>
