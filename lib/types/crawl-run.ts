import { z } from 'zod'

/** 화면 설계서 01의 crawlStatus와 1:1로 맞춘다. 화면 전용 'idle'은 저장하지 않는다(docs/PRD.md §CrawlRun). */
export const crawlRunStatusSchema = z.enum([
  'running',
  'done',
  'partial-failed',
  'failed',
  'aborted',
])
export type CrawlRunStatus = z.infer<typeof crawlRunStatusSchema>

/** `YYYYMMDD-HHmmss`(로컬 시각) + 충돌 시 접미 숫자(docs/CONVENTIONS.md §식별자 규칙). */
const crawlRunIdSchema = z
  .string()
  .regex(/^\d{8}-\d{6}(-\d+)?$/, 'run id는 YYYYMMDD-HHmmss 형식이어야 합니다')

/**
 * 언론사 1곳의 실행 중 상태. 화면 설계서 01 §영역별 컴포넌트 명세·§상태별 화면 ③⑤가 요구하는
 * 필드 그대로다. `failReason`은 언론사 전체 실패(피드·목록 페이지 실패)에만 실리는 **정형 라벨**
 * 이다 — HTML은 `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음` 중 하나다
 * (`docs/screens/01-crawl-run.md` §상태별 화면 ⑤). 원문(Playwright·fetch 오류 문장)을 그대로
 * 내보내면 `docs/CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다")을 어긴다 —
 * `lib/crawler/run-manager.ts`의 `normalizeFailReason`이 여기서 다듬는다(6일차 화면 워크스트림
 * 리뷰 지적, 7일차 크롤 파이프라인 반영). `rawFailReason`은 다듬기 전 원문을 남겨 디버깅 여지를
 * 준다 — 화면이 쓰지 않아도 된다.
 *
 * `crawlRunSchema.pressResults`(아래)가 이 스키마를 `.extend()`해 쓰므로 `crawlRunSchema`보다
 * 앞에 둔다.
 */
export const pressRunStatusSchema = z.object({
  pressId: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['waiting', 'running', 'done', 'failed']),
  collected: z.number().int().nonnegative(),
  target: z.number().int().nonnegative(),
  failReason: z.string().optional(),
  rawFailReason: z.string().optional(),
})
export type PressRunStatus = z.infer<typeof pressRunStatusSchema>

/**
 * 실행 **종료 시점**의 언론사 1곳 최종 결과(I-022 해소). `pressRunStatusSchema`와 필드 모양은
 * 같지만 상태값에서 `'running'`만 뺀다 — 실행이 끝난 뒤에는 "진행 중"이 논리적으로 있을 수
 * 없고, 남겨두면 소비자(복구 로직·화면)가 "복구가 덜 됐나"로 오해할 여지가 생긴다.
 * `'waiting'`은 남긴다 — 중단(`aborted`)으로 그 언론사 차례가 오기 전에 실행이 끝나면 실제로
 * "시도조차 못 함"이 최종 상태이고, 이걸 억지로 `'failed'`로 밀어 넣으면 D-029가 막으려 한
 * "실패"와 "시도 안 함"의 뒤섞임이 여기서도 재현된다.
 *
 * 별도 `z.object`를 새로 쓰지 않고 `pressRunStatusSchema.extend()`로 파생한 이유: 필드 6개가
 * 완전히 같고 `status` 하나만 달라서, 손으로 다시 쓰면 필드가 하나 어긋나도 타입 시스템이
 * 못 잡는 "같은 모양의 인터페이스를 손으로 또 쓰지 않는다"(CONVENTIONS §3) 위반이 된다.
 */
export const pressRunResultSchema = pressRunStatusSchema.extend({
  status: z.enum(['waiting', 'done', 'failed']),
})
export type PressRunResult = z.infer<typeof pressRunResultSchema>

export const crawlRunSchema = z.object({
  id: crawlRunIdSchema,
  targetPressIds: z.array(z.string().min(1)).min(1),
  startedAt: z.iso.datetime({ offset: true }),
  // 실행 중(status: 'running')에는 아직 끝나지 않았으므로 null. Date 객체 대신 ISO 8601 문자열로 고정한다.
  finishedAt: z.iso.datetime({ offset: true }).nullable(),
  successCount: z.number().int().nonnegative(),
  /** **수집을 시도했다가 실패한** 기사 수. 중단으로 요청조차 하지 않은 건은 여기 들어가지 않는다. */
  failCount: z.number().int().nonnegative(),
  /**
   * 중단 요청으로 요청조차 하지 않은 기사 수(I-017). `failCount`와 나눠 세지 않으면 중단 버튼을
   * 누른 실행이 "실패 43건"으로 남아 화면이 destructive Alert를 띄운다.
   *
   * **선택 필드 + 기본값 0인 이유**: 이 필드가 생기기 전에 만들어진 `run-meta.json`은 이 키가 없다.
   * 필수로 두면 과거 파일이 `crawlRunSchema.safeParse`에서 떨어지고 → `readRunMeta`가 손상으로
   * 던지고 → `listRuns`가 그 예외를 삼켜 **해당 run이 목록에서 통째로 사라진다**(D-026에서 실제
   * 코드 경로로 확인한 함정이다).
   */
  skippedCount: z.number().int().nonnegative().default(0),
  /**
   * 실행 **종료 시점**의 언론사별 최종 결과(I-022 해소). 지금까지 `run-meta.json`에는 기사 단위
   * 합계(`successCount`/`failCount`/`skippedCount`)만 남고 "어느 언론사가 왜 실패했는지"는 어디에도
   * 저장되지 않아, 서버가 재시작되면 `recoverRunProgress`가 저장된 기사 개수만 세어
   * `collected > 0 ? 'done' : 'waiting'` 두 상태로만 근사 복원했다 — 그 결과 피드·목록 페이지 실패로
   * 기사를 한 건도 못 모은 언론사가 재시작 후 조회하면 '대기'(아직 시작도 안 한 것처럼)로 보였다.
   * 이 필드가 채워지면 복구 로직은 근사 대신 이 배열을 그대로 읽으면 된다.
   *
   * **선택 필드 + 기본값 빈 배열인 이유**: `skippedCount`(위 주석)와 같은 함정이다. 이 필드가
   * 생기기 전에 만들어진 `run-meta.json`은 이 키가 없다. 필수로 두면 과거 파일이
   * `crawlRunSchema.safeParse`에서 떨어지고 → `readRunMeta`가 손상으로 던지고 → `listRuns`가 그
   * 예외를 삼켜 **해당 run이 목록에서 통째로 사라진다**(D-026에서 실제 코드 경로로 확인한 함정).
   */
  pressResults: z.array(pressRunResultSchema).default([]),
  status: crawlRunStatusSchema,
})
export type CrawlRun = z.infer<typeof crawlRunSchema>

/** 크롤링 실행 요청. 화면의 언론사 체크박스 선택과 언론사당 최대 기사 수 입력에 대응한다. */
export const crawlStartRequestSchema = z.object({
  pressIds: z.array(z.string().min(1)).min(1, '언론사를 최소 1곳 선택하세요'),
  maxArticlesPerPress: z.number().int().positive().optional(),
})
export type CrawlStartRequest = z.infer<typeof crawlStartRequestSchema>

/**
 * 진행 중 실행의 스냅샷. `lib/crawler/run-manager.ts`의 잡 레지스트리가 메모리에 들고 있는
 * 값이고(docs/CONVENTIONS.md §5 — globalThis 싱글턴), `getRunProgress`가 그대로 돌려준다.
 * `run-meta.json`(CrawlRun)과 달리 파일로 영속화하지 않는다 — "진행 상태는 메모리, 최종 결과는
 * 파일"이 Task 014의 설계 원칙이다.
 */
export const runProgressSchema = z.object({
  runId: z.string().min(1),
  status: crawlRunStatusSchema,
  overallPercent: z.number().min(0).max(100),
  /** 현재 처리 중인 언론사 이름. 아직 시작 전이거나 전부 끝나면 null. */
  currentPressName: z.string().nullable(),
  currentCollected: z.number().int().nonnegative(),
  currentTarget: z.number().int().nonnegative(),
  pressStatuses: z.array(pressRunStatusSchema),
  /**
   * 실행 종료 시점의 집계. `run-meta.json`(`CrawlRun`)과 같은 세 값이지만 화면(016B)이
   * `GET /api/crawl/{runId}` 폴링 하나만으로 완료·부분 실패·중단 요약("기사 N건 저장",
   * "M건 미수집")을 그릴 수 있어야 해서 여기에도 싣는다 — 이 화면은 `GET /api/runs/{runId}`
   * (Task 017, 저장소 계층 소유)를 호출하지 않는다(§③ "이 훅이 돌려주는 RunProgress만 그린다").
   * 진행 중(`status: 'running'`)에는 0으로 유지하다가 `runInBackground`가 종료 직전에
   * 채운다 — 진행 중 화면은 이 값 대신 `pressStatuses[].collected`/`overallPercent`를 쓴다.
   * `skippedCount`는 "실패"에 합치지 않는다(I-017) — 화면이 "N건 미수집"으로 따로 쓴다.
   */
  successCount: z.number().int().nonnegative(),
  failCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  /**
   * true면 이 스냅샷이 근사 복원이다. 서버 재시작 뒤 레지스트리가 run을 안 들고 있으면
   * `recoverRunProgress`가 두 갈래로 나뉜다(`lib/crawler/run-manager.ts`, Task 014B): `run.pressResults`
   * (I-022)가 채워져 있으면 그대로 옮겨 정확히 복원하고 이 필드를 세우지 않는다. **비어 있을 때만**
   * (과거 형식 run, 또는 pressResults 없이 강제종료된 run) 기사 파일 개수로 근사하고 true를 세운다 —
   * 이 근사 경로에서만 `pressStatuses[].target`이 실제 목표치가 아니라 `collected`와 같은 값으로
   * 채워진다. 원래 20건 목표였다가 5건에서 중단된 언론사가 이 필드 없이는 "5/5건 · 완료"로 보여
   * 실제보다 확정적으로 읽힌다(8일차 교차검증 후속). 정상(레지스트리 적중) 경로에서도 이 필드를
   * 아예 붙이지 않는다 — 기존 소비처(015B 등)를 깨지 않는 선택적 필드다.
   */
  recovered: z.boolean().optional(),
})
export type RunProgress = z.infer<typeof runProgressSchema>
