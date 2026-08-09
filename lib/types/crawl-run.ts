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
