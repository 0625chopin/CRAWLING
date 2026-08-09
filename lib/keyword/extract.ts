import 'server-only'

import type { PosTag } from '@/lib/types/keyword'
import { posTagSchema } from '@/lib/types/keyword'

import { safeTokenize, type KiwiToken } from './kiwi'

/** 집계(020B, aggregate.ts) 이전 단계의 키워드 후보 하나. */
export interface KeywordCandidate {
  keyword: string
  posTag: PosTag
}

const ALLOWED_POS = new Set<string>(posTagSchema.options)

// ⚠️ 1글자 명사·SL 제외. "것"·"수"는 NNB(의존명사)라 품사 필터에서 이미 걸러지지만,
// "점"은 NNG로 잡히므로 길이 필터가 없으면 그대로 통과한다(kiwi-verification.md §6 실측).
// SL(영문)도 예외 없이 같은 기준을 적용한다 — "AI"는 통과, 단독 "G" 같은 1글자는 제외.
const MIN_KEYWORD_LENGTH = 2

function isAllowedPos(tag: string): tag is PosTag {
  return ALLOWED_POS.has(tag)
}

/**
 * 토큰 → 키워드 후보. 품사 필터(NNG/NNP/SL) → 1글자 제외 → 불용어 제외 순으로 적용한다.
 * stopwords는 호출부가 getStopwordSet()(Task 006)으로 조회해 주입한다 — 화면에서 관리하는
 * 값이므로 이 모듈에 하드코딩하지 않는다(docs/ROADMAP.md Task 020 구현 규칙).
 */
export function filterKeywordTokens(
  tokens: readonly KiwiToken[],
  stopwords: ReadonlySet<string>
): KeywordCandidate[] {
  const candidates: KeywordCandidate[] = []

  for (const token of tokens) {
    if (!isAllowedPos(token.tag)) continue
    if (token.str.length < MIN_KEYWORD_LENGTH) continue
    if (stopwords.has(token.str)) continue

    candidates.push({ keyword: token.str, posTag: token.tag })
  }

  return candidates
}

/**
 * 텍스트 → 키워드 후보. safeTokenize(Kiwi 형태소 분석)와 filterKeywordTokens를 이어 붙인
 * 편의 함수다 — 020B가 기사 본문을 순회할 때 이 함수 하나만 호출하면 되고, kiwi.ts의 원시
 * API는 lib/keyword/ 밖으로 노출되지 않는다(D-002).
 */
export async function extractKeywords(
  text: string,
  stopwords: ReadonlySet<string>
): Promise<KeywordCandidate[]> {
  const tokens = await safeTokenize(text)
  return filterKeywordTokens(tokens, stopwords)
}
