/**
 * `GET /api/runs`의 `label`, `GET /api/runs/[runId]`의 `durationLabel`이 공유하는 서버 조립
 * 포맷 로직(docs/ROADMAP.md Task 017 구현 규칙 "셀렉터 라벨은 서버에서 조립해 내려준다").
 * 두 응답이 같은 `startedAt`/`finishedAt`을 포맷하므로 라우트 안에 각자 짜면 한쪽만 고쳐지는
 * 사고가 난다(docs/DECISIONS.md D-025). 날짜 포맷은 **틀려도 화면이 멀쩡해 보이는** 종류라
 * vitest 회귀 대상이다(docs/CONVENTIONS.md §9) — fs를 건드리지 않는 순수 함수라 'server-only'는
 * 붙이지 않는다(§4가 요구하는 대상은 fs·playwright·kiwi-nlp 직접 import 파일뿐이다).
 */

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * ISO 8601 문자열을 로컬 "YYYY-MM-DD HH:mm" 형식으로 바꾼다. 초 단위는 셀렉터 라벨에 없다
 * (docs/screens/02-collect-result.md 와이어프레임 `2026-08-10 14:32` 참고). `startedAt`은
 * `new Date().toISOString()`(UTC)로 저장되므로(lib/storage/run-repository.ts), `Date` getter가
 * 실행 중인 서버(로컬 1인 도구이므로 곧 사용자)의 로컬 시간대로 자동 변환해 준다.
 */
export function formatLocalDateTimeMinute(iso: string): string {
  const date = new Date(iso)
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

/**
 * "6분 36초" 형식의 소요시간 라벨. 진행 중(`finishedAt`이 null)이면 아직 소요시간을 말할 수
 * 없으므로 null을 돌려준다 — 화면이 이 값을 그대로 렌더할지 감출지 판단한다.
 */
export function formatDurationLabel(
  startedAt: string,
  finishedAt: string | null
): string | null {
  if (finishedAt === null) return null

  const elapsedMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  // 시각이 역전된 손상 데이터를 만나도 음수 "-1분" 같은 무의미한 값을 내보내지 않는다.
  if (elapsedMs < 0) return null

  const totalSeconds = Math.round(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

/**
 * ISO 8601 문자열을 로컬 "YYYY-MM-DD HH:mm:ss" 형식으로 바꾼다. 초 단위까지 필요한 곳은
 * 실행 요약 카드의 시작·종료 시각뿐이다(docs/screens/02-collect-result.md §③, Task 018A) —
 * 셀렉터 라벨(`formatLocalDateTimeMinute`)과 분 단위로 갈리는 이유도 화면 영역이 다르기 때문이다.
 */
export function formatLocalDateTimeSecond(iso: string): string {
  const date = new Date(iso)
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

export interface RunListLabelInput {
  startedAt: string
  targetPressCount: number
  successCount: number
  failCount: number
}

/**
 * "2026-08-10 14:32 · 언론사 3 · 성공 42 · 실패 2" 형식의 실행 선택 Select 옵션 라벨
 * (docs/screens/02-collect-result.md §② 실행 선택). `skippedCount`는 여기 넣지 않는다 —
 * I-017이 정확히 "건너뛴 건을 실패에 합치는" 사고였고, 이 라벨은 애초에 skippedCount를
 * 받지 않으므로 그 함정이 구조적으로 재발하지 않는다.
 */
export function buildRunListLabel(input: RunListLabelInput): string {
  const dateTime = formatLocalDateTimeMinute(input.startedAt)
  return `${dateTime} · 언론사 ${input.targetPressCount} · 성공 ${input.successCount} · 실패 ${input.failCount}`
}
