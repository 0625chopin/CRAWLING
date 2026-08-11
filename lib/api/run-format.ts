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

/**
 * ISO 8601 문자열을 로컬 "HH:mm" 형식으로 바꾼다(날짜·초 생략). 실행 요약 카드의 모바일 폭과
 * 기사 파일 목록의 "수집 시각" 열이 이 축약 형식을 쓴다(docs/screens/02-collect-result.md §③·④
 * 와이어프레임). **I-025 해소**: 이전에는 화면(`run-summary-card.tsx`)이
 * `formatLocalDateTimeSecond`의 출력 문자열을 `slice(11, 16)`으로 잘라 만들었는데, 그 함수의
 * 출력 폭이 나중에 바뀌면(타임존 접미사 추가 등) 컴파일 에러도 런타임 예외도 없이 조용히 엉뚱한
 * 자리를 잘라 틀린 시각을 보여줄 위험이 있었다. `Date`에서 시:분을 직접 조립해 그 결합을 끊는다.
 */
export function formatLocalTimeOnly(iso: string): string {
  const date = new Date(iso)
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${hh}:${mi}`
}

/**
 * ISO 8601 문자열을 로컬 "HH:mm:ss" 형식으로 바꾼다(날짜 생략, 초는 유지). 본문 미리보기
 * 메타 줄의 모바일 폭이 이 형식을 쓴다(docs/screens/02-collect-result.md §⑤ 모바일 와이어프레임
 * "14:33:10 수집" — ③의 모바일 축약(`formatLocalTimeOnly`, 초까지 생략)과는 규칙이 다르다).
 * `formatLocalTimeOnly`와 같은 이유로 다른 포맷 함수의 출력 문자열을 자르지 않고 `Date`에서
 * 직접 조립한다(I-025 재발 방지).
 */
export function formatLocalTime(iso: string): string {
  const date = new Date(iso)
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${hh}:${mi}:${ss}`
}

/**
 * 기사 **발행 시각** 라벨. 값이 없으면(발행 시각 미상, `Article.publishedAt` 주석) null이다 —
 * 화면이 "미상"으로 그릴지 행을 감출지 스스로 정한다. 여기서 "-"나 빈 문자열을 지어내지 않는다.
 *
 * `reference`(대개 같은 기사의 `crawledAt`)와 **로컬 날짜가 같으면 `HH:mm`, 다르면 `MM-DD HH:mm`**
 * 이다. RSS 피드에는 전날 이전 기사가 섞여 오는데(`OTHER_DATE_SLOT` 참고) 시:분만 보여주면
 * 어제 22시 기사가 오늘 22시로 읽힌다 — 목록의 시각 열은 좁아서 항상 날짜를 붙일 수는 없으므로,
 * **날짜가 다를 때만** 붙여 그 경우를 눈에 띄게 한다. 날짜 포맷은 틀려도 화면이 멀쩡해 보이는
 * 종류라 vitest 회귀 대상이다(docs/CONVENTIONS.md §9).
 */
export function formatPublishedTimeLabel(
  publishedAt: string | null,
  reference: string
): string | null {
  if (!publishedAt) return null

  const published = new Date(publishedAt)
  if (Number.isNaN(published.getTime())) return null

  const hhmm = `${pad(published.getHours())}:${pad(published.getMinutes())}`

  const referenceDate = new Date(reference)
  const sameLocalDate =
    !Number.isNaN(referenceDate.getTime()) &&
    published.getFullYear() === referenceDate.getFullYear() &&
    published.getMonth() === referenceDate.getMonth() &&
    published.getDate() === referenceDate.getDate()

  if (sameLocalDate) return hhmm
  return `${pad(published.getMonth() + 1)}-${pad(published.getDate())} ${hhmm}`
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
