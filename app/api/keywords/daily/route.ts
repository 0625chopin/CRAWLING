import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { categoryQuerySchema, posQuerySchema, readCategoryParams } from '@/lib/api/query-params'
import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import {
  buildDailyKeywordItems,
  ensureDailyKeywords,
  selectOtherDateArticleCount,
  selectSlotAggregate,
  selectSlotArticleCounts,
  selectUnknownTimeArticleCount,
  toAnalysisSummary,
} from '@/lib/keyword/daily-keywords'
import { filterKeywordItems } from '@/lib/keyword/filter-keywords'
import { UnsafePathSegmentError } from '@/lib/storage/paths'
import { dateKeySchema, getPreviousSlotIndex, timeSlotIndexSchema } from '@/lib/types/time-slot'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).
// 하루치를 처음 집계할 때는 기사 수천 건을 토큰화하므로 수십 초가 걸릴 수 있다. 이 프로젝트는
// 로컬 전용이라 실행 시간 상한을 설계 근거로 삼지 않으며(§6), 두 번째 조회부터는 캐시 위에서
// 새로 늘어난 run만 증분 반영한다.

/**
 * `slot`은 `all`(전체 시간대) 또는 0~7이다. 문자열 `all`을 별도 값으로 둔 것은 "고르지 않음"과
 * "전체를 골랐음"이 화면에서 같은 뜻이라 굳이 가를 필요가 없어서다 — 파라미터를 생략해도 같다.
 */
const slotSchema = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value === 'all' ? null : value))
  .refine(
    (value) => value === null || timeSlotIndexSchema.safeParse(Number(value)).success,
    { message: 'slot은 all 또는 0~7 사이의 구간 번호여야 합니다' }
  )
  .transform((value) => (value === null ? null : Number(value)))

const dailyQuerySchema = z.object({
  date: dateKeySchema,
  slot: slotSchema,
  minCount: z.coerce
    .number('최소 등장 횟수는 숫자여야 합니다')
    .int('최소 등장 횟수는 정수여야 합니다')
    .positive('최소 등장 횟수는 1 이상이어야 합니다')
    .optional(),
  pos: posQuerySchema.optional(),
  topN: z.coerce
    .number('표시 개수는 숫자여야 합니다')
    .int('표시 개수는 정수여야 합니다')
    .positive('표시 개수는 1 이상이어야 합니다')
    .optional(),
  category: categoryQuerySchema,
})

const EMPTY_DATE_MESSAGE = '이 날짜에는 수집된 기사가 없어 분석할 키워드가 없습니다.'

/**
 * 날짜 하루치를 시간대 구간별로 집계해 돌려준다. run 단위(`GET /api/runs/{runId}/keywords`)와 달리
 * **그날의 모든 run을 합치고 기사 URL로 중복을 제거한 뒤** 발행 시각 구간으로 자른다 — run 하나에는
 * 최근 몇 시간치 피드만 담겨(10:26 실행 실측: 07~10시 발행분이 대부분) "0~3시 대비 4~6시" 같은
 * 비교가 성립하지 않기 때문이다.
 *
 * `count`는 **언급 기사 수**다(총 등장 횟수가 아니다 — `lib/keyword/aggregate.ts` 주석).
 * `previousCount`·`delta`는 직전 구간과의 비교값이며, 비교할 구간 자체가 없으면(전체 시간대이거나
 * 하루의 첫 구간 0~3시) null이다.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const force = searchParams.get('force') === 'true'

  const parsed = dailyQuerySchema.safeParse({
    date: searchParams.get('date') ?? undefined,
    slot: searchParams.get('slot') ?? undefined,
    minCount: searchParams.get('minCount') ?? undefined,
    pos: searchParams.get('pos') ?? undefined,
    topN: searchParams.get('topN') ?? undefined,
    category: readCategoryParams(searchParams),
  })
  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  const { date, slot, category: categories, minCount, pos, topN } = parsed.data

  return withErrorBoundary(async () => {
    let built
    try {
      built = await ensureDailyKeywords(date, { force })
    } catch (error) {
      // date가 경로 조각으로 쓰이므로 형식이 어긋나면 500이 아니라 400이다(I-021과 같은 처방).
      if (error instanceof UnsafePathSegmentError) {
        return fail(error.message, 400)
      }
      throw error
    }

    const previousSlot = slot === null ? null : getPreviousSlotIndex(slot)
    const current = selectSlotAggregate(built.file, slot, categories)
    const previous =
      previousSlot === null ? null : selectSlotAggregate(built.file, previousSlot, categories)

    const items = buildDailyKeywordItems(current, previous)
    // 날짜 전체 기사 수 — "이 날짜에 원본 자체가 없다"와 "구간에만 없다"를 가르는 기준이다
    // (run 단위 응답의 sourceArticleCount와 같은 역할, keywords-response.ts 주석 참고).
    const totalArticleCount = selectSlotAggregate(built.file, null, categories).articleCount

    return ok({
      date,
      builtAt: built.file.builtAt,
      slot,
      previousSlot,
      runCount: built.file.runIds.length,
      summary: toAnalysisSummary(current),
      items: filterKeywordItems(items, { minCount, pos, topN }),
      totalItemCount: items.length,
      slotArticleCounts: selectSlotArticleCounts(built.file, categories),
      /** 발행 시각을 몰라 어느 구간에도 넣지 못한 기사 수 — 조용히 사라지지 않게 화면이 밝힌다. */
      unknownTimeCount: selectUnknownTimeArticleCount(built.file, categories),
      /** 발행 날짜가 이 날짜와 달라(대개 전날 기사) 구간에 넣지 않은 기사 수. */
      otherDateCount: selectOtherDateArticleCount(built.file, categories),
      uncategorizedCount: current.uncategorizedCount,
      totalArticleCount,
      skippedArticleCount: built.skippedArticleCount,
      ...(totalArticleCount === 0 && built.file.seenUrls.length === 0
        ? { message: EMPTY_DATE_MESSAGE }
        : {}),
    })
  }, '시간대별 키워드 집계를 불러오지 못했습니다')
}
