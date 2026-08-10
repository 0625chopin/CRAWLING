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

export const crawlRunSchema = z.object({
  id: crawlRunIdSchema,
  targetPressIds: z.array(z.string().min(1)).min(1),
  startedAt: z.iso.datetime({ offset: true }),
  // 실행 중(status: 'running')에는 아직 끝나지 않았으므로 null. Date 객체 대신 ISO 8601 문자열로 고정한다.
  finishedAt: z.iso.datetime({ offset: true }).nullable(),
  successCount: z.number().int().nonnegative(),
  failCount: z.number().int().nonnegative(),
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
 * 언론사 1곳의 실행 중 상태. 화면 설계서 01 §영역별 컴포넌트 명세·§상태별 화면 ③⑤가 요구하는
 * 필드 그대로다. `failReason`은 언론사 전체 실패(피드·목록 페이지 실패)에만 실리는 **정형 라벨**
 * 이다 — HTML은 `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음` 중 하나다
 * (`docs/screens/01-crawl-run.md` §상태별 화면 ⑤). 원문(Playwright·fetch 오류 문장)을 그대로
 * 내보내면 `docs/CONVENTIONS.md` §7("원시 오류를 화면까지 흘리지 않는다")을 어긴다 —
 * `lib/crawler/run-manager.ts`의 `normalizeFailReason`이 여기서 다듬는다(6일차 화면 워크스트림
 * 리뷰 지적, 7일차 크롤 파이프라인 반영). `rawFailReason`은 다듬기 전 원문을 남겨 디버깅 여지를
 * 준다 — 화면이 쓰지 않아도 된다.
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
})
export type RunProgress = z.infer<typeof runProgressSchema>
