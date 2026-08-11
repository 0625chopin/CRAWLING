import { describe, expect, it } from 'vitest'

import {
  getPreviousSlotIndex,
  getTimeSlotLabel,
  resolveTimeSlotIndex,
  TIME_SLOTS,
  toLocalDateKey,
} from './time-slot'

// 시간대 배치는 틀려도 화면이 멀쩡해 보이는 로직이다(docs/CONVENTIONS.md §9) — 기사가 옆 구간에
// 들어가도 랭킹은 그럴듯한 숫자를 그대로 보여준다. 경계 시각과 "미상" 처리를 여기서 못박는다.

describe('TIME_SLOTS — 하루 24시간을 빠짐없이 덮는다', () => {
  it('구간이 겹치지 않고 0시부터 23시까지 이어진다', () => {
    expect(TIME_SLOTS[0].startHour).toBe(0)
    expect(TIME_SLOTS[TIME_SLOTS.length - 1].endHour).toBe(23)

    for (let i = 1; i < TIME_SLOTS.length; i += 1) {
      expect(TIME_SLOTS[i].startHour).toBe(TIME_SLOTS[i - 1].endHour + 1)
    }
  })

  it('24개 시각이 모두 어느 한 구간에 배치된다', () => {
    const slots = Array.from({ length: 24 }, (_, hour) => {
      const date = new Date(2026, 7, 11, hour, 30)
      return resolveTimeSlotIndex(date.toISOString())
    })

    expect(slots.every((slot) => slot !== null)).toBe(true)
    expect(new Set(slots).size).toBe(TIME_SLOTS.length)
  })
})

describe('resolveTimeSlotIndex — 경계와 미상', () => {
  // 로컬 시각 기준이므로 Date 생성자에 연·월·일·시를 직접 넘겨 만든다(ISO 문자열 리터럴을 쓰면
  // 실행 환경 시간대에 따라 다른 시각이 되어 테스트가 환경에 종속된다).
  const atLocalHour = (hour: number, minute = 0) =>
    new Date(2026, 7, 11, hour, minute).toISOString()

  it.each([
    [0, 0],
    [3, 0],
    [4, 1],
    [6, 1],
    [7, 2],
    [21, 6],
    [22, 7],
    [23, 7],
  ])('%i시는 %i번 구간이다', (hour, expected) => {
    expect(resolveTimeSlotIndex(atLocalHour(hour))).toBe(expected)
  })

  it('구간 끝 시각의 59분도 그 구간에 남는다(3시 59분은 여전히 0~3시)', () => {
    expect(resolveTimeSlotIndex(atLocalHour(3, 59))).toBe(0)
  })

  // 미상을 0번 구간으로 접으면 "새벽 기사"와 뒤섞여 0~3시 랭킹이 오염된다.
  it('값이 없거나 파싱할 수 없으면 null이다 — 0번 구간으로 접지 않는다', () => {
    expect(resolveTimeSlotIndex(undefined)).toBeNull()
    expect(resolveTimeSlotIndex('')).toBeNull()
    expect(resolveTimeSlotIndex('어제')).toBeNull()
  })
})

describe('getPreviousSlotIndex — 첫 구간에는 비교 대상이 없다', () => {
  it('0번 구간의 직전은 null이다', () => {
    expect(getPreviousSlotIndex(0)).toBeNull()
  })

  it('나머지 구간의 직전은 바로 앞 번호다', () => {
    expect(getPreviousSlotIndex(1)).toBe(0)
    expect(getPreviousSlotIndex(7)).toBe(6)
  })
})

describe('라벨과 날짜 키', () => {
  it('없는 구간 번호에는 문구를 지어내지 않는다', () => {
    expect(getTimeSlotLabel(1)).toBe('4~6시')
    expect(getTimeSlotLabel(8)).toBeUndefined()
    expect(getTimeSlotLabel(-1)).toBeUndefined()
  })

  // run id 앞 8자리(로컬 시각)와 같은 형식이어야 두 값을 그대로 비교할 수 있다.
  it('toLocalDateKey는 YYYYMMDD를 제로패딩해 만든다', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 59))).toBe('20260105')
  })
})
