import { z } from 'zod'

/** `sw-` + 4자리 제로패딩 순번(docs/CONVENTIONS.md §식별자 규칙). */
const stopwordIdSchema = z.string().regex(/^sw-\d{4}$/, 'stopword id는 sw-0000 형식이어야 합니다')

export const stopwordSchema = z.object({
  id: stopwordIdSchema,
  word: z.string().min(1),
  isDefault: z.boolean(),
})
export type Stopword = z.infer<typeof stopwordSchema>

const stopwordSingleCreateSchema = z.strictObject({
  word: z.string().min(1, '불용어를 입력하세요'),
})

const stopwordBulkCreateSchema = z.strictObject({
  words: z.array(z.string().min(1)).min(1, '불용어를 1개 이상 입력하세요'),
})

/**
 * 단건({ word }) 또는 일괄({ words: string[] }) 입력을 모두 받는다(ROADMAP Task 011).
 * 두 형태에 공통 판별자 필드가 없어 discriminatedUnion을 쓸 수 없다 — word/words 키 자체가 판별 수단이다.
 */
export const stopwordCreateSchema = z.union([
  stopwordSingleCreateSchema,
  stopwordBulkCreateSchema,
])
export type StopwordCreateInput = z.infer<typeof stopwordCreateSchema>
