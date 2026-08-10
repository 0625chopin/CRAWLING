import { describe, expect, it } from 'vitest'

import { extractKeywords, filterKeywordTokens } from './extract'
import {
  ENGLISH_LENGTH_SENTENCE,
  JOIN_AFFIX_TRAP_SENTENCES,
  PARTICLE_VARIANT_SENTENCES,
  SINGLE_CHAR_NOISE_SENTENCES,
} from './fixtures'
import { safeTokenize } from './kiwi'

// 이 파일의 모든 케이스는 실제 Kiwi 모델(data/kiwi-model/)로 형태소 분석을 돈다 — 틀려도
// 화면이 멀쩡해 보이는 규칙(품사 필터·1글자 제외·함정 ②)이라 목(mock)으로는 회귀를 잡을 수
// 없다(docs/ROADMAP.md Task 020 DoD, Q4 결정). build()는 globalThis 싱글턴이라 이 파일
// 안에서 여러 번 호출해도 최초 1회만 비용이 든다.

describe('filterKeywordTokens — 품사·길이·불용어 필터', () => {
  it('명사(NNG/NNP)만 남기고 조사·어미·동사는 제거한다', async () => {
    const tokens = await safeTokenize(PARTICLE_VARIANT_SENTENCES[0])
    const candidates = filterKeywordTokens(tokens, new Set())

    expect(candidates.map((c) => c.keyword)).toEqual(['삼성전자', '발표'])
    expect(candidates.every((c) => c.posTag === 'NNG' || c.posTag === 'NNP')).toBe(true)
  })

  it('조사 5종 변형이 모두 "삼성전자"를 포함한 키워드 후보로 남는다', async () => {
    for (const sentence of PARTICLE_VARIANT_SENTENCES) {
      const tokens = await safeTokenize(sentence)
      const candidates = filterKeywordTokens(tokens, new Set())
      expect(candidates.map((c) => c.keyword)).toContain('삼성전자')
    }
  })

  it('1글자 토큰(것·수·점)이 결과에 없다', async () => {
    for (const sentence of SINGLE_CHAR_NOISE_SENTENCES) {
      const tokens = await safeTokenize(sentence)
      const keywords = filterKeywordTokens(tokens, new Set()).map((c) => c.keyword)

      expect(keywords).not.toContain('것')
      expect(keywords).not.toContain('수')
      expect(keywords).not.toContain('점')
    }
  })

  // 길이 필터는 품사와 무관하게 걸린다 — NNG/NNP 예시만 있으면 나중에 누가 필터를 품사별로
  // 쪼갤 때 SL 쪽 1글자 제외가 조용히 빠질 수 있다(docs/ROADMAP.md Task 020 구현 규칙).
  it('SL(영문) 1글자는 제외하고 2글자 이상은 남는다', async () => {
    const tokens = await safeTokenize(ENGLISH_LENGTH_SENTENCE)
    const candidates = filterKeywordTokens(tokens, new Set())
    const keywords = candidates.map((c) => c.keyword)

    expect(keywords).toContain('AI')
    expect(keywords).not.toContain('G')
    expect(candidates.find((c) => c.keyword === 'AI')?.posTag).toBe('SL')
  })

  it('⚠️ 함정 ② 회귀 — 확장·적용·경쟁이 모두 키워드에 남는다', async () => {
    const expandKeywords = filterKeywordTokens(
      await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.expand),
      new Set()
    ).map((c) => c.keyword)
    const applyKeywords = filterKeywordTokens(
      await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.apply),
      new Set()
    ).map((c) => c.keyword)
    const competeKeywords = filterKeywordTokens(
      await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.compete),
      new Set()
    ).map((c) => c.keyword)

    expect(expandKeywords).toContain('확장')
    expect(applyKeywords).toContain('적용')
    expect(competeKeywords).toContain('경쟁')
  })

  it('생태계·신제품이 쪼개지지 않고 한 단어로 잡힌다', async () => {
    const expandKeywords = filterKeywordTokens(
      await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.expand),
      new Set()
    ).map((c) => c.keyword)
    const applyKeywords = filterKeywordTokens(
      await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.apply),
      new Set()
    ).map((c) => c.keyword)

    expect(expandKeywords).toContain('생태계')
    expect(applyKeywords).toContain('신제품')
  })

  it('불용어 Set에 있는 단어는 결과에서 제외된다', async () => {
    // "이번 신제품은 최신 기술을 적용했다"에는 기본 불용어 프리셋의 "이번"(NNG)이 포함된다.
    const tokens = await safeTokenize(JOIN_AFFIX_TRAP_SENTENCES.apply)

    const withoutStopwords = filterKeywordTokens(tokens, new Set()).map((c) => c.keyword)
    const withStopwords = filterKeywordTokens(tokens, new Set(['이번'])).map((c) => c.keyword)

    expect(withoutStopwords).toContain('이번')
    expect(withStopwords).not.toContain('이번')
    // 불용어 제외는 다른 키워드에 영향을 주지 않는다.
    expect(withStopwords).toContain('신제품')
  })
})

describe('extractKeywords — 텍스트 → 키워드 후보 편의 함수', () => {
  it('safeTokenize + filterKeywordTokens를 이어 붙인 것과 같은 결과를 낸다', async () => {
    const sentence = PARTICLE_VARIANT_SENTENCES[0]
    const tokens = await safeTokenize(sentence)
    const expected = filterKeywordTokens(tokens, new Set())

    const actual = await extractKeywords(sentence, new Set())
    expect(actual).toEqual(expected)
  })
})
