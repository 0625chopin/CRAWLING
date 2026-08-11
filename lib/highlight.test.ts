import { describe, expect, it } from 'vitest'

import { escapeRegExp, splitByMatch } from './highlight'

describe('escapeRegExp', () => {
  it('정규식 특수문자를 리터럴로 이스케이프한다', () => {
    expect(escapeRegExp('C++')).toBe('C\\+\\+')
    expect(escapeRegExp('(주)')).toBe('\\(주\\)')
    expect(escapeRegExp('A.I. [속보]')).toBe('A\\.I\\. \\[속보\\]')
  })

  // escapeRegExp의 문자 클래스(`/[.*+?^${}()|[\]\\]/g`)는 JS 정규식 메타문자 14개를 전부
  // 다룬다. 위 테스트는 그중 6개(. + ( ) [ ])만 실제로 건드려, 나머지 8개(* ? ^ $ { } | \)
  // 중 하나가 문자 클래스에서 빠져도 테스트가 계속 통과했다(22일차 팀장 판정). it.each로
  // 14개 전부를 개별 검증해 그 구멍을 막는다 — 문자열 비교뿐 아니라 실제 `new RegExp`로
  // 만들어 그 문자 자신을 리터럴로 매칭하는지까지 확인한다(사용 경로와 같은 방식).
  it.each([
    ['.', '\\.'],
    ['*', '\\*'],
    ['+', '\\+'],
    ['?', '\\?'],
    ['^', '\\^'],
    ['$', '\\$'],
    ['{', '\\{'],
    ['}', '\\}'],
    ['(', '\\('],
    [')', '\\)'],
    ['|', '\\|'],
    ['[', '\\['],
    [']', '\\]'],
    ['\\', '\\\\'],
  ])('메타문자 %s를 이스케이프하고 리터럴로만 매칭한다', (char, escaped) => {
    expect(escapeRegExp(char)).toBe(escaped)
    expect(new RegExp(escapeRegExp(char)).test(char)).toBe(true)
  })
})

describe('splitByMatch', () => {
  it('빈 검색어는 아무것도 강조하지 않은 원문 그대로를 돌려준다', () => {
    expect(splitByMatch('삼성전자 HBM4', '')).toEqual([
      { text: '삼성전자 HBM4', matched: false },
    ])
    expect(splitByMatch('삼성전자 HBM4', '   ')).toEqual([
      { text: '삼성전자 HBM4', matched: false },
    ])
  })

  it('일치하지 않으면 전체를 matched: false 구간 하나로 돌려준다', () => {
    expect(splitByMatch('삼성전자 HBM4', '카카오')).toEqual([
      { text: '삼성전자 HBM4', matched: false },
    ])
  })

  it('대소문자를 무시하고 일치 구간을 원문 표기 그대로 쪼갠다', () => {
    expect(splitByMatch('Samsung HBM4 Launch', 'hbm4')).toEqual([
      { text: 'Samsung ', matched: false },
      { text: 'HBM4', matched: true },
      { text: ' Launch', matched: false },
    ])
  })

  it('연속·다중 일치를 모두 찾는다', () => {
    expect(splitByMatch('AI, AI, AI', 'ai')).toEqual([
      { text: 'AI', matched: true },
      { text: ', ', matched: false },
      { text: 'AI', matched: true },
      { text: ', ', matched: false },
      { text: 'AI', matched: true },
    ])
  })

  it('바로 붙어 있는 연속 일치도 빈 구간 없이 쪼갠다', () => {
    expect(splitByMatch('aaaa', 'aa')).toEqual([
      { text: 'aa', matched: true },
      { text: 'aa', matched: true },
    ])
  })

  it('정규식 특수문자가 든 검색어도 리터럴로 매칭한다', () => {
    expect(splitByMatch('가격은 (할인) 30% 적용', '(할인)')).toEqual([
      { text: '가격은 ', matched: false },
      { text: '(할인)', matched: true },
      { text: ' 30% 적용', matched: false },
    ])
  })

  // 역슬래시는 이스케이프 문자 자신이라 테스트 문자열에서도 이스케이프가 필요해 가장
  // 실수하기 쉽다(22일차 팀장 지적) — escapeRegExp 단위 테스트뿐 아니라 splitByMatch를
  // 통째로 태우는 경로에서도 확인한다.
  it('역슬래시가 든 검색어도 리터럴로 매칭한다', () => {
    expect(splitByMatch('경로: C:\\Users\\report.txt', 'C:\\Users\\')).toEqual([
      { text: '경로: ', matched: false },
      { text: 'C:\\Users\\', matched: true },
      { text: 'report.txt', matched: false },
    ])
  })
})
