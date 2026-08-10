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

/**
 * 언론사 1곳 = 카테고리 1개(팀장 확정, Task 026) — Press가 피드 URL 하나에 대응하므로
 * "연합뉴스 경제"와 "연합뉴스 스포츠"는 별개 등록이다. 5종 고정이며 여기서만 추가·제거한다.
 */
export const pressCategorySchema = z.enum([
  'it-ai',
  'entertainment',
  'sports',
  'economy',
  'stock',
])
export type PressCategory = z.infer<typeof pressCategorySchema>

/**
 * 카테고리 한국어 표시명의 단일 소스(Task 026 팀장 지시). 화면이 각자 '엔터'/'엔터테인먼트'로
 * 갈리지 않도록 여기 한 곳에서만 정의하고, 소비하는 쪽은 이 맵을 그대로 쓴다.
 */
export const PRESS_CATEGORY_LABELS: Record<PressCategory, string> = {
  'it-ai': 'IT/AI',
  entertainment: '엔터',
  sports: '스포츠',
  economy: '경제',
  stock: '증권',
}

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
  /**
   * 선택 필드 + 기본값 'it-ai'(Task 026, 팀장 지시). 카테고리 키가 없는 과거
   * `data/press-sources.json`(기존 5곳)이 필수 필드 취급되면 파싱에서 떨어지고, 그러면
   * `listPress`가 그 예외를 삼켜 언론사 전체가 목록에서 통째로 사라진다 — D-026·I-022가
   * `run-meta.json`에서 실제 코드 경로로 확인한 것과 같은 함정이다. 기존 5곳은 전부 IT/AI
   * 매체이므로 기본값이 실제로도 맞는 값이다.
   *
   * **주의**: `z.infer` 출력 타입에서는 `.default()`가 있어도 이 필드가 **필수**다(zod v4 —
   * 값이 없을 때 채워 넣는 것이지 타입에서 지워지는 것이 아니다). `PressCreateInput`/
   * `PressSource`를 리터럴로 만드는 코드(테스트 픽스처 등)는 `category`를 명시해야 한다.
   */
  category: pressCategorySchema.default('it-ai'),
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
