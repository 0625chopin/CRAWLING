import { describe, expect, it } from 'vitest'

import { buildRunListLabel, formatDurationLabel, formatLocalDateTimeMinute } from './run-format'

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
