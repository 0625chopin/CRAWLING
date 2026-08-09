import { z } from 'zod'

/**
 * 언론사 id는 이름에서 만든 슬러그다(docs/CONVENTIONS.md §식별자 규칙).
 * 생성 후 불변 — 저장된 기사 txt가 이 값을 참조하므로 형식만 검증하고 값 자체는 저장소 계층이 부여한다.
 */
const pressIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id는 소문자·숫자·하이픈만 사용할 수 있습니다')

const pressCommonFields = {
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
const rssPressCreateSchema = z.strictObject({ ...pressCommonFields, ...rssFields })
const htmlPressCreateSchema = z.strictObject({ ...pressCommonFields, ...htmlFields })

/** 언론사 생성 입력. id는 저장소 계층(Task 006)이 슬러그로 부여하므로 여기 없다. */
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
export const htmlPressSchema = htmlPressCreateSchema.extend({ id: pressIdSchema })

/** Press = z.discriminatedUnion('sourceType', ...) — z.union이나 전부 optional인 평평한 객체로 만들지 않는다. */
export const pressSchema = z.discriminatedUnion('sourceType', [rssPressSchema, htmlPressSchema])

export type RssPressSource = z.infer<typeof rssPressSchema>
export type HtmlPressSource = z.infer<typeof htmlPressSchema>
export type PressSource = z.infer<typeof pressSchema>
