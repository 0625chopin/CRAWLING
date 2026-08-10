import { z } from 'zod'

import { pressCategorySchema, type PressCategory } from '@/lib/types/press'

/**
 * `?category=a&category=b`처럼 반복 파라미터로 오는 다중 선택 카테고리 필터를 검증하는 zod
 * 조각이다. `GET /api/press` · `GET /api/runs/{runId}/articles` · `GET /api/runs/{runId}/keywords`
 * 세 라우트가 같은 규칙(다중 선택 허용, 미지정 = 전체, 잘못된 값은 필드별 한국어 메시지)을
 * 쓰므로 라우트마다 다시 짜지 않고 여기 하나로 모은다(Task 026 팀장 지시).
 *
 * 각 라우트의 쿼리 스키마(`z.object({...})`)에 `category: categoryQuerySchema`로 끼워 넣어
 * 쓴다 — `keywordsQuerySchema`가 `pos`·`minCount`를 다루는 것과 같은 자리다.
 */
export const categoryQuerySchema = z
  .array(z.string())
  .optional()
  .refine(
    (values) =>
      values === undefined ||
      values.every((value) => pressCategorySchema.safeParse(value).success),
    { message: `category는 ${pressCategorySchema.options.join(', ')} 중에서 선택하세요` }
  )
  .transform((values) => values as PressCategory[] | undefined)

/**
 * `URLSearchParams.getAll('category')`가 돌려주는 빈 배열은 "필터 없음"을 뜻해야 한다.
 * 빈 배열을 그대로 스키마에 넘기면 `.optional()` 분기를 타지 못해 "카테고리 0개 선택 → 전부
 * 제외"로 잘못 해석될 여지가 생기므로, 호출 전에 여기서 undefined로 접는다.
 */
export function readCategoryParams(searchParams: URLSearchParams): string[] | undefined {
  const values = searchParams.getAll('category')
  return values.length > 0 ? values : undefined
}
