import { describe, expect, it } from 'vitest'

import { DEFAULT_STOPWORDS } from '@/lib/storage/stopword-defaults'

import { aggregateKeywords } from './aggregate'
import { JOIN_AFFIX_TRAP_SENTENCES, PARTICLE_VARIANT_SENTENCES } from './fixtures'

// extract.test.ts(020A)와 마찬가지로 실제 Kiwi 모델(data/kiwi-model/)로 형태소 분석을 돈다 —
// 빈도 합산·정렬·AnalysisSummary 수치는 틀려도 화면이 멀쩡해 보이는 로직이라 목(mock)으로는
// 회귀를 잡을 수 없다(docs/ROADMAP.md Task 020 DoD, Q4 결정). build()는 globalThis 싱글턴이라
// 이 파일 안에서 여러 번 호출해도 최초 1회만 비용이 든다.

describe('aggregateKeywords — 조사 변형 합산 (DoD ①)', () => {
  it('삼성전자가/를/는/의/에서 5문장이 삼성전자 5회로 합산된다', async () => {
    const { items } = await aggregateKeywords(
      'run-particle',
      [...PARTICLE_VARIANT_SENTENCES],
      new Set()
    )

    const samsung = items.find((item) => item.keyword === '삼성전자')
    expect(samsung?.count).toBe(5)
    expect(samsung?.posTag).toBe('NNP')
  })

  // fixtures.ts 주석의 형태소열대로면 이 5문장의 나머지 키워드(발표·인수·전략·개발)는
  // 전부 1회씩만 등장한다 — 빈도 내림차순 + 동률 가나다순 정렬을 같은 입력으로 함께 검증한다.
  it('빈도 내림차순, 동률은 가나다순으로 정렬된다', async () => {
    const { items } = await aggregateKeywords(
      'run-sort',
      [...PARTICLE_VARIANT_SENTENCES],
      new Set()
    )

    expect(items[0]).toMatchObject({ keyword: '삼성전자', count: 5 })
    expect(items.slice(1).every((item) => item.count === 1)).toBe(true)
    expect(items.slice(1).map((item) => item.keyword)).toEqual([
      '개발',
      '발표',
      '인수',
      '전략',
    ])
  })
})

describe('aggregateKeywords — count는 "언급 기사 수"다', () => {
  // 이 프로젝트가 vitest 대상으로 못박은 부류다(CONVENTIONS §9 "틀려도 화면이 멀쩡해 보이는
  // 로직") — 총 등장 횟수와 언급 기사 수는 똑같이 생긴 정수라, 기준이 되돌아가도 화면은 숫자만
  // 커질 뿐 아무 이상이 없어 보인다. 실제로 그 상태에서 전문 수집 기사 2건이 "vLLM 96회"를
  // 만들어 랭킹 7위를 차지했다(aggregate.ts 주석의 실측).
  it('한 기사 안에서 같은 키워드가 여러 번 나와도 1로 센다', async () => {
    const repeated =
      '삼성전자가 신제품을 공개했다. 삼성전자는 다음 달 출시한다고 밝혔다. 삼성전자의 목표는 점유율 확대다.'

    const { items } = await aggregateKeywords('run-dedupe', [repeated], new Set())

    expect(items.find((item) => item.keyword === '삼성전자')?.count).toBe(1)
  })

  it('서로 다른 기사에 나오면 기사 수만큼 센다', async () => {
    const { items } = await aggregateKeywords(
      'run-dedupe-multi',
      [
        '삼성전자가 신제품을 공개했다. 삼성전자는 다음 달 출시한다.',
        '삼성전자의 실적이 개선됐다.',
        '오픈AI가 새 모델을 발표했다.',
      ],
      new Set()
    )

    expect(items.find((item) => item.keyword === '삼성전자')?.count).toBe(2)
  })
})

describe('aggregateKeywords — 기본 불용어 제외 (DoD ②)', () => {
  it('기본 불용어 7건이 결과에서 빠지고 stopwordExcludedCount가 0보다 크다', async () => {
    const article =
      '김철수 기자가 촬영한 사진을 제공했다. 이번 신제품은 최신 기술을 적용했다'
    const stopwords = new Set(DEFAULT_STOPWORDS)

    const { items, summary } = await aggregateKeywords(
      'run-stopword',
      [article],
      stopwords
    )

    for (const word of ['기자', '사진', '제공', '이번']) {
      expect(items.some((item) => item.keyword === word)).toBe(false)
    }
    expect(summary.stopwordExcludedCount).toBeGreaterThan(0)
  })
})

describe('aggregateKeywords — 토큰 감소율 (DoD ③)', () => {
  it('기사 4건 기준 감소율이 kiwi-verification §5 실측치(약 57.8%)와 같은 자릿수다', async () => {
    const articles = [
      // kiwi-verification.md §5 "조사 제거 실증"에 쓰인 원문 그대로.
      '삼성전자가 온디바이스 AI 반도체를 공개했다. 오픈AI는 새로운 언어모델을 발표하면서 개발자 생태계 확장에 나섰다.',
      JOIN_AFFIX_TRAP_SENTENCES.expand,
      JOIN_AFFIX_TRAP_SENTENCES.apply,
      JOIN_AFFIX_TRAP_SENTENCES.compete,
    ]

    const { summary } = await aggregateKeywords('run-ratio', articles, new Set())
    const reductionRatio =
      (summary.totalTokenCount - summary.filteredTokenCount) / summary.totalTokenCount

    // "같은 자릿수"를 십의 자리 단위로 넓게 잡아 40~70% 대역으로 판정한다 — 정확히 57.8%를
    // 재현할 입력(원 4건 기사)이 없으므로 자릿수(약 5~60%대)가 같은지만 확인한다.
    expect(reductionRatio).toBeGreaterThan(0.4)
    expect(reductionRatio).toBeLessThan(0.7)
  })
})

describe('aggregateKeywords — AnalysisSummary 5개 수치', () => {
  it('5개 수치를 모두 산출한다', async () => {
    const { summary } = await aggregateKeywords(
      'run-summary',
      [...PARTICLE_VARIANT_SENTENCES],
      new Set()
    )

    expect(summary.articleCount).toBe(5)
    expect(summary.totalTokenCount).toBeGreaterThan(0)
    expect(summary.filteredTokenCount).toBeGreaterThan(0)
    expect(summary.filteredTokenCount).toBeLessThanOrEqual(summary.totalTokenCount)
    expect(summary.stopwordExcludedCount).toBe(0) // 이 케이스는 불용어를 넘기지 않았다
    expect(summary.uniqueKeywordCount).toBe(5) // 삼성전자·발표·인수·전략·개발
  })

  it('기사 0건이면 모든 수치가 0이다', async () => {
    const { summary, items } = await aggregateKeywords('run-empty', [], new Set())

    expect(summary).toEqual({
      articleCount: 0,
      totalTokenCount: 0,
      filteredTokenCount: 0,
      stopwordExcludedCount: 0,
      uniqueKeywordCount: 0,
    })
    expect(items).toEqual([])
  })
})
