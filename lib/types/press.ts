import { z } from 'zod'

/**
 * 언론사 id는 슬러그 형식(소문자·영숫자·하이픈)이다(docs/CONVENTIONS.md §식별자 규칙).
 * 생성 후 불변 — 저장된 기사 txt가 이 값을 참조한다. 사용자가 생성 입력에 직접 지정할 수도
 * 있고(아래 pressCommonFields.id), 비우면 저장소 계층이 name에서 슬러그를 만들어 부여한다.
 * 어느 경로든 값이 이 형식을 지키는지는 여기서 검증한다.
 */
const pressIdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'id는 소문자·숫자·하이픈만 사용할 수 있습니다'
  )

const pressCommonFields = {
  /**
   * 선택 필드. 언론사가 실제로 쓰는 영문 브랜드명을 슬러그로 직접 지정하고 싶을 때 쓴다
   * ("블로터" → "bloter"). 로마자 표기 라이브러리는 발음만 옮길 뿐 브랜드명을 알지 못해
   * "전자신문" 같은 한글 전용 이름에는 쓸모가 없다(docs/ISSUES.draft.저장소계층.md, 3일차
   * 교차검증 결정). 비우면 저장소 계층(createPress)이 name에서 슬러그를 기계적으로 만든다.
   */
  id: pressIdSchema.optional(),
  name: z.string().min(1, '언론사명을 입력하세요'),
  isActive: z.boolean(),
}

const rssFields = {
  sourceType: z.literal('rss'),
  feedUrl: z.url('올바른 피드 URL을 입력하세요'),
  // 존재 여부가 곧 "원문 전문을 수집할지"의 의사 표현이다. 별도 boolean을 두지 않는다(ROADMAP Task 004 구현 규칙).
  contentSelector: z.string().min(1, '본문 셀렉터를 입력하세요').optional(),
}

const htmlFields = {
  sourceType: z.literal('html'),
  listUrl: z.url('올바른 목록 페이지 URL을 입력하세요'),
  articleLinkSelector: z.string().min(1, '기사 링크 셀렉터를 입력하세요'),
  titleSelector: z.string().min(1, '제목 셀렉터를 입력하세요'),
  contentSelector: z.string().min(1, '본문 셀렉터를 입력하세요'),
}

// strictObject로 미지의 키를 거부한다 — sourceType: 'rss' 입력에 articleLinkSelector 같은
// 반대쪽 방식 필드가 섞여 들어와도 조용히 저장되지 않고 검증에서 막힌다(Task 004 DoD).
const rssPressCreateSchema = z.strictObject({
  ...pressCommonFields,
  ...rssFields,
})
const htmlPressCreateSchema = z.strictObject({
  ...pressCommonFields,
  ...htmlFields,
})

/**
 * 언론사 생성 입력. id는 선택이다 — 지정하면 저장소 계층이 그 값을 그대로 쓰고(중복이면
 * 접미 숫자를 붙인다), 비우면 name에서 슬러그를 기계적으로 만드는 폴백을 탄다(Task 006).
 */
export const pressCreateSchema = z.discriminatedUnion('sourceType', [
  rssPressCreateSchema,
  htmlPressCreateSchema,
])
export type PressCreateInput = z.infer<typeof pressCreateSchema>

/**
 * 수정 입력도 생성과 같은 형태다. sourceType이 바뀌는 PATCH는 부분 병합이 아니라
 * 전체 필드를 다시 받아 새 방식의 레코드로 교체한다(ROADMAP Task 006 구현 규칙) —
 * 그래서 "일부만 보내는 patch" 스키마가 아니라 생성과 동일한 완전한 형태를 그대로 쓴다.
 */
export const pressUpdateSchema = pressCreateSchema
export type PressUpdateInput = z.infer<typeof pressUpdateSchema>

// extend는 Config(strict/strip 여부)를 그대로 물려받는다 — id를 더해도 미지의 키 거부는 유지된다.
export const rssPressSchema = rssPressCreateSchema.extend({ id: pressIdSchema })
export const htmlPressSchema = htmlPressCreateSchema.extend({
  id: pressIdSchema,
})

/** Press = z.discriminatedUnion('sourceType', ...) — z.union이나 전부 optional인 평평한 객체로 만들지 않는다. */
export const pressSchema = z.discriminatedUnion('sourceType', [
  rssPressSchema,
  htmlPressSchema,
])

export type RssPressSource = z.infer<typeof rssPressSchema>
export type HtmlPressSource = z.infer<typeof htmlPressSchema>
export type PressSource = z.infer<typeof pressSchema>
