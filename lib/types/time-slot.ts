import { z } from 'zod'

/**
 * 하루를 8구간으로 자른 시간대 슬롯(팀장 확정). 첫 구간만 4시간(0~3시)이고 나머지는 3시간이며,
 * 마지막 22~23시까지 24시간을 빠짐없이 덮는다 — 어느 구간에도 속하지 않아 집계에서 조용히
 * 사라지는 기사가 있으면 안 되기 때문이다(docs/CONVENTIONS.md §7).
 *
 * 기준 시각은 **기사 발행 시각(RSS `pubDate`)을 로컬 시각으로 읽은 값**이다. 저장된 값은 ISO
 * 8601 문자열(대개 UTC)이므로 `Date.getHours()`로 로컬 변환해 읽는다 — run id를 로컬 시각으로
 * 찍는 `run-repository.ts`의 `formatLocalRunTimestamp`와 같은 기준이라 "8월 11일"이 두 곳에서
 * 서로 다른 날을 가리키는 일이 없다.
 */
export interface TimeSlot {
  /** 0부터 시작하는 구간 번호. 캐시 파일의 버킷 키이자 API의 `slot` 파라미터 값이다. */
  index: number
  /** 구간 시작 시(포함). */
  startHour: number
  /** 구간 끝 시(**포함**) — 0~3 구간의 endHour는 4가 아니라 3이다. */
  endHour: number
  label: string
}

export const TIME_SLOTS: readonly TimeSlot[] = [
  { index: 0, startHour: 0, endHour: 3, label: '0~3시' },
  { index: 1, startHour: 4, endHour: 6, label: '4~6시' },
  { index: 2, startHour: 7, endHour: 9, label: '7~9시' },
  { index: 3, startHour: 10, endHour: 12, label: '10~12시' },
  { index: 4, startHour: 13, endHour: 15, label: '13~15시' },
  { index: 5, startHour: 16, endHour: 18, label: '16~18시' },
  { index: 6, startHour: 19, endHour: 21, label: '19~21시' },
  { index: 7, startHour: 22, endHour: 23, label: '22~23시' },
] as const

/** 시(0~23) → 슬롯 번호. TIME_SLOTS가 24시간을 전부 덮으므로 유효한 시각이면 반드시 하나를 찾는다. */
const HOUR_TO_SLOT: readonly number[] = Array.from({ length: 24 }, (_, hour) => {
  const slot = TIME_SLOTS.find((candidate) => hour >= candidate.startHour && hour <= candidate.endHour)
  if (!slot) {
    // 모듈 로드 시점에 터진다 — TIME_SLOTS를 잘못 고쳐 구멍이 생기면 조용히 통과시키지 않는다.
    throw new Error(`TIME_SLOTS가 ${hour}시를 덮지 않습니다`)
  }
  return slot.index
})

export const timeSlotIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(TIME_SLOTS.length - 1)

export function getTimeSlot(index: number): TimeSlot | undefined {
  return TIME_SLOTS[index]
}

/**
 * 슬롯 라벨. 없는 번호에는 문구를 지어내지 않고 undefined를 돌려준다 — 화면이 "?~?시" 같은
 * 가짜 구간을 그리지 않게 하기 위해서다.
 */
export function getTimeSlotLabel(index: number): string | undefined {
  return getTimeSlot(index)?.label
}

/** 직전 구간 번호. 첫 구간(0~3시)에는 **같은 날 안에** 비교 대상이 없으므로 null이다. */
export function getPreviousSlotIndex(index: number): number | null {
  return index > 0 && index < TIME_SLOTS.length ? index - 1 : null
}

/**
 * ISO 8601 시각 문자열 → 슬롯 번호. **값이 없거나 파싱할 수 없으면 null**이다(= 발행 시각 미상).
 * 이 경우를 0번 슬롯으로 접지 않는다 — "새벽에 나온 기사"와 "언제 나왔는지 모르는 기사"는 다른
 * 사실이고, 뭉개면 0~3시 구간이 시각 미상 기사로 오염된다(`article-category-filter.ts`가 카테고리
 * 미상을 임의의 카테고리로 통과시키지 않는 것과 같은 원칙).
 */
export function resolveTimeSlotIndex(publishedAt: string | undefined): number | null {
  if (!publishedAt) return null
  const date = new Date(publishedAt)
  const time = date.getTime()
  if (Number.isNaN(time)) return null
  return HOUR_TO_SLOT[date.getHours()] ?? null
}

/**
 * `Date` → `YYYYMMDD`(로컬 시각). run id 앞 8자리와 같은 형식·같은 기준이라 두 값을 그대로
 * 비교할 수 있다(`run-repository.ts`의 `formatLocalRunTimestamp` 참고).
 */
export function toLocalDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

/** `YYYYMMDD` 8자리만 허용한다. 저장 경로 조각으로 쓰이므로 형식을 여기서 못 박는다. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{8}$/, '날짜는 YYYYMMDD 형식이어야 합니다')

/** `20260811` → `2026-08-11`. 화면 라벨 전용이며 저장·조회 키로는 쓰지 않는다. */
export function formatDateKeyLabel(dateKey: string): string {
  return `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`
}
