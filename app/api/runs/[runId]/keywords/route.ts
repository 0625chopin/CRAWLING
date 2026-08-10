import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import { analyzeRun } from '@/lib/keyword/analyze-run'
import { buildKeywordsResponseBody } from '@/lib/keyword/keywords-response'
import { RunNotFoundError } from '@/lib/storage/run-repository'
import { posTagSchema, type PosTag } from '@/lib/types/keyword'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).
// 이 프로젝트에는 실행 시간 상한이 없으므로 maxDuration도 선언하지 않는다(ROADMAP Task 021
// 구현 규칙 — 최초 분석은 Kiwi build() 1.4초를 포함해도 기사 200건 기준 3~4초 수준이라
// 요청 하나 안에서 끝내도 된다. 진행 상태를 따로 폴링할 필요가 없다).

/**
 * `pos`는 쉼표로 구분한 복수 값을 받는다(`?pos=NNG,NNP`) — 조건 바가 `ToggleGroup
 * type="multiple"`로 여러 품사를 동시에 켤 수 있어야 한다(docs/screens/03-hot-keyword.md
 * §① 조건 바 와이어프레임 "품사 [x NNG][x NNP][ SL ]"). Task 022A가 조건 바를 구현할 때
 * 그대로 이 형식으로 호출한다(결정 초안: docs/DECISIONS.draft.저장소계층.md).
 */
const posListSchema = z
  .string()
  .min(1, 'pos 값을 확인하세요')
  .transform((value) => [
    ...new Set(
      value
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
    ),
  ])
  .refine(
    (values) => values.length > 0 && values.every((value) => posTagSchema.safeParse(value).success),
    { message: `pos는 ${posTagSchema.options.join(', ')} 중에서 쉼표로 구분해 입력하세요` }
  )
  .transform((values) => values as PosTag[])

const keywordsQuerySchema = z.object({
  minCount: z.coerce
    .number('최소 등장 횟수는 숫자여야 합니다')
    .int('최소 등장 횟수는 정수여야 합니다')
    .positive('최소 등장 횟수는 1 이상이어야 합니다')
    .optional(),
  pos: posListSchema.optional(),
  topN: z.coerce
    .number('표시 개수는 숫자여야 합니다')
    .int('표시 개수는 정수여야 합니다')
    .positive('표시 개수는 1 이상이어야 합니다')
    .optional(),
})

/**
 * run 하나의 키워드 분석 결과를 조회한다. 캐시(`keywords.json`)가 있으면 즉시 읽고, 없으면
 * `analyzeRun`이 자동으로 분석해 기록한다(021A, D-033의 계약을 그대로 쓴다 — 이 라우트는
 * `hasKeywords`를 직접 확인하지 않는다). `minCount`·`pos`·`topN`은 캐시 위에서 이 라우트가
 * 매 요청마다 다시 적용한다 — Kiwi를 다시 도는 것은 `force=true`일 때뿐이다(ROADMAP Task 021
 * 구현 규칙 "캐시와 재분석의 경계").
 *
 * `force`는 `app/api/press/route.ts`의 `active` 필터와 같은 방식으로 처리한다(`=== 'true'`만
 * true) — 불리언 플래그는 "true가 아니면 false"로 충분해 무효값을 zod로 따로 거부할 이유가
 * 없다. `minCount`·`pos`·`topN`은 숫자·enum 형식이 잘못될 수 있어 zod로 검증해 필드별 한국어
 * 메시지를 낸다(docs/CONVENTIONS.md §6).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const force = request.nextUrl.searchParams.get('force') === 'true'

  const parsed = keywordsQuerySchema.safeParse({
    minCount: request.nextUrl.searchParams.get('minCount') ?? undefined,
    pos: request.nextUrl.searchParams.get('pos') ?? undefined,
    topN: request.nextUrl.searchParams.get('topN') ?? undefined,
  })
  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(async () => {
    let result
    try {
      result = await analyzeRun(runId, { force })
    } catch (error) {
      // 없는 run은 D-022가 확정한 전용 타입으로 온다 — 문자열 매칭으로 판정하지 않는다.
      if (error instanceof RunNotFoundError) {
        return fail(error.message, 404)
      }
      throw error
    }

    const body = buildKeywordsResponseBody(
      result.file,
      { minCount: parsed.data.minCount, pos: parsed.data.pos, topN: parsed.data.topN },
      result.skippedArticleCount
    )
    return ok(body)
  }, '키워드 분석 결과를 불러오지 못했습니다')
}
