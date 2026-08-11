import { describe, expect, it } from 'vitest'

import {
  buildRunListLabel,
  formatDurationLabel,
  formatLocalDateTimeMinute,
  formatLocalDateTimeSecond,
  formatLocalTime,
  formatLocalTimeOnly,
  formatPublishedTimeLabel,
} from './run-format'

describe('formatLocalDateTimeMinute', () => {
  it('ISO 문자열을 로컬 "YYYY-MM-DD HH:mm"으로 바꾼다(초 단위는 버린다)', () => {
    // UTC+9(KST) 로컬 실행을 가정한 이 저장소의 개발 환경 기준. 서버 프로세스와 사용자가
    // 같은 기기인 로컬 1인 도구라 시간대 변환 자체가 문제되지 않는다(run-repository.ts와 동일 전제).
    const iso = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatLocalDateTimeMinute(iso)).toBe('2026-08-10 14:32')
  })

  it('한 자리 월·일·시·분을 0으로 채운다', () => {
    const iso = new Date(2026, 0, 5, 9, 3, 0).toISOString()
    expect(formatLocalDateTimeMinute(iso)).toBe('2026-01-05 09:03')
  })
})

describe('formatLocalDateTimeSecond', () => {
  it('ISO 문자열을 로컬 "YYYY-MM-DD HH:mm:ss"로 바꾼다(초 단위를 보존한다)', () => {
    const iso = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatLocalDateTimeSecond(iso)).toBe('2026-08-10 14:32:05')
  })

  it('한 자리 월·일·시·분·초를 0으로 채운다', () => {
    const iso = new Date(2026, 0, 5, 9, 3, 7).toISOString()
    expect(formatLocalDateTimeSecond(iso)).toBe('2026-01-05 09:03:07')
  })
})

describe('formatDurationLabel', () => {
  it('"6분 36초" 형식으로 소요시간을 만든다', () => {
    const startedAt = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    const finishedAt = new Date(2026, 7, 10, 14, 38, 41).toISOString()
    expect(formatDurationLabel(startedAt, finishedAt)).toBe('6분 36초')
  })

  it('진행 중(finishedAt이 null)이면 null을 돌려준다', () => {
    const startedAt = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatDurationLabel(startedAt, null)).toBeNull()
  })

  it('시각이 역전된 손상 데이터는 음수 대신 null을 돌려준다', () => {
    const startedAt = new Date(2026, 7, 10, 14, 38, 41).toISOString()
    const finishedAt = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatDurationLabel(startedAt, finishedAt)).toBeNull()
  })

  it('0초 소요도 "0분 0초"로 정상 표시한다', () => {
    const iso = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatDurationLabel(iso, iso)).toBe('0분 0초')
  })
})

describe('formatPublishedTimeLabel', () => {
  const crawledAt = new Date(2026, 7, 11, 10, 26, 0).toISOString()

  it('수집일과 같은 날이면 시:분만 보여준다', () => {
    const publishedAt = new Date(2026, 7, 11, 9, 58, 30).toISOString()
    expect(formatPublishedTimeLabel(publishedAt, crawledAt)).toBe('09:58')
  })

  // 피드에 남아 있던 전날 기사를 시:분만으로 보여주면 오늘 그 시각에 나온 것처럼 읽힌다.
  // 목록의 시각 열은 좁아 항상 날짜를 붙일 수 없으므로 다를 때만 붙인다.
  it('수집일과 다른 날이면 월-일을 함께 보여준다', () => {
    const publishedAt = new Date(2026, 7, 10, 22, 5, 0).toISOString()
    expect(formatPublishedTimeLabel(publishedAt, crawledAt)).toBe('08-10 22:05')
  })

  it('해가 바뀌어도 날짜가 다르면 월-일을 붙인다', () => {
    const newYearCrawl = new Date(2026, 0, 1, 0, 30, 0).toISOString()
    const publishedAt = new Date(2025, 11, 31, 23, 50, 0).toISOString()
    expect(formatPublishedTimeLabel(publishedAt, newYearCrawl)).toBe('12-31 23:50')
  })

  // 값이 없을 때 수집 시각으로 대신 채우거나 "-"를 지어내지 않는다 — 화면이 "미상"으로 밝힌다.
  it('발행 시각이 없거나 깨졌으면 null이다', () => {
    expect(formatPublishedTimeLabel(null, crawledAt)).toBeNull()
    expect(formatPublishedTimeLabel('알 수 없음', crawledAt)).toBeNull()
  })
})

describe('formatLocalTimeOnly', () => {
  it('ISO 문자열에서 시:분만 뽑는다(날짜·초는 생략한다)', () => {
    const iso = new Date(2026, 7, 10, 14, 32, 5).toISOString()
    expect(formatLocalTimeOnly(iso)).toBe('14:32')
  })

  it('한 자리 시·분을 0으로 채운다', () => {
    const iso = new Date(2026, 0, 5, 9, 3, 47).toISOString()
    expect(formatLocalTimeOnly(iso)).toBe('09:03')
  })
})

describe('formatLocalTime', () => {
  it('ISO 문자열에서 시:분:초를 뽑는다(날짜는 생략한다)', () => {
    const iso = new Date(2026, 7, 10, 14, 33, 10).toISOString()
    expect(formatLocalTime(iso)).toBe('14:33:10')
  })

  it('한 자리 시·분·초를 0으로 채운다', () => {
    const iso = new Date(2026, 0, 5, 9, 3, 7).toISOString()
    expect(formatLocalTime(iso)).toBe('09:03:07')
  })

  // I-025 회귀: 두 함수 모두 Date에서 시:분(:초)을 직접 조립하므로, 같은 입력에서
  // formatLocalDateTimeSecond의 출력이 formatLocalTime의 출력으로 끝나야 한다. 예전처럼
  // formatLocalDateTimeSecond의 출력 문자열을 slice(11, 16) 등으로 잘라 만들었다면, 그 함수의
  // 출력 폭이 바뀌는 순간 이 교차 확인이 깨져 결합이 다시 생겼음을 알려준다.
  it('formatLocalDateTimeSecond의 출력이 이 함수의 결과로 끝난다(문자열 슬라이스 결합 재발 방지)', () => {
    const iso = new Date(2026, 7, 10, 14, 33, 10).toISOString()
    expect(formatLocalDateTimeSecond(iso).endsWith(formatLocalTime(iso))).toBe(true)
  })
})

describe('buildRunListLabel', () => {
  it('와이어프레임과 동일한 형식을 만든다', () => {
    const label = buildRunListLabel({
      startedAt: new Date(2026, 7, 10, 14, 32, 5).toISOString(),
      targetPressCount: 3,
      successCount: 42,
      failCount: 2,
    })
    expect(label).toBe('2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2')
  })

  // I-017 회귀: 중단으로 건너뛴 기사 수(skippedCount)가 있어도 라벨의 "실패" 수치는
  // failCount 그대로여야 한다. 이 함수는 skippedCount를 입력으로조차 받지 않으므로
  // 합산 사고가 구조적으로 재발할 수 없다는 것을 인터페이스로도 확인한다.
  it('skippedCount를 입력받지 않는다 — 실패 수치에 합산될 통로 자체가 없다', () => {
    const label = buildRunListLabel({
      startedAt: new Date(2026, 7, 10, 21, 14, 14).toISOString(),
      targetPressCount: 4,
      successCount: 53,
      failCount: 0,
    })
    expect(label).toContain('실패 0')
    expect(label).not.toContain('실패 41') // skippedCount(41)가 섞여 들어오면 이 값이 됐을 것
  })
})
