import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type {
  PressCategory,
  PressCreateInput,
  PressSource,
  PressUpdateInput,
} from '@/lib/types/press'

/**
 * GET /api/press가 내려주는 형태. 서버가 sourceType 분기 없이 쓸 수 있는 대표 URL을
 * 미리 만들어 붙여 준다(app/api/press/route.ts의 withSourceUrl) — 화면은 이 필드를
 * 그대로 쓰고 sourceType 분기를 다시 하지 않는다.
 */
export type PressSourceWithUrl = PressSource & { sourceUrl: string }

/**
 * 소스 테스트 요청(Task 010B). 저장 도메인 타입(`lib/types/press.ts`, 저장소 계층 소유)과
 * 모양이 겹치지만 별개다 — 저장 전 검증이라 방식별 필요 최소 필드만 받는다(RSS는 피드 URL
 * 하나, HTML은 목록 URL·기사 링크 셀렉터뿐, docs/screens/04-press-manage.md §설계 결정 근거 3).
 * 서버 쪽 검증 스키마(`app/api/press/test-source/route.ts`의 `testSourceRequestSchema`, zod)는
 * `app/api/press/[id]/route.ts`의 `activeOnlyPatchSchema`처럼 **검증 로직이라 라우트 로컬로
 * 둔다** — 다만 이 타입(입력 모양)은 여기서만 선언하고 그 라우트도 값 자체는 이 타입을 따로
 * import하지 않는 대신 zod가 같은 모양을 스스로 검증한다(요청 스키마는 검증 책임까지 겸하므로
 * 응답 타입과 달리 두 번 선언해도 "같은 모양이 어긋나는" 위험이 zod 파싱 실패로 즉시 드러난다).
 */
export type PressSourceTestRequest =
  | { sourceType: 'rss'; feedUrl: string }
  | { sourceType: 'html'; listUrl: string; articleLinkSelector: string }

/**
 * 소스 테스트 응답. 서버가 계산해 내려주는 값이라 외부 입력 검증 대상이 아니다 —
 * `lib/crawler/rss.ts`의 `FeedItem`처럼 zod 대신 평범한 TS 타입으로 둔다.
 *
 * **선언은 여기 한 곳뿐이다.** `app/api/press/test-source/route.ts`가 `import type`으로
 * 이 타입을 그대로 가져다 쓴다 — 타입 전용 import라 런타임 결합(서버 코드가 클라이언트
 * 번들에 섞이는 것)은 생기지 않는다. 처음에는 두 파일이 같은 모양을 각자 손으로 선언했는데,
 * 그러면 한쪽만 고쳐도 타입 에러 없이 화면이 조용히 어긋날 수 있어(7일차 화면 워크스트림
 * 리뷰 지적) 한 곳으로 모았다.
 */
export interface RssSourceTestResult {
  count: number
  /** 요약(description) 평균 길이(문자 수). 0건이면 0. `contentSelector` 필요 여부 판단 근거. */
  avgSummaryLength: number
  samples: { title: string; link: string }[]
}

export interface HtmlSourceTestResult {
  count: number
  samples: string[]
}

export type PressSourceTestResult = RssSourceTestResult | HtmlSourceTestResult

/**
 * 서버 실패 응답을 던질 때 fieldErrors까지 함께 옮긴다. 일반 Error로 던지면
 * PressFormDialog가 필드별 한국어 문구(D-009)를 입력 하단에 그대로 쓸 방법이 없다.
 */
export class ApiRequestError extends Error {
  fieldErrors?: Record<string, string>

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiRequestError'
    this.fieldErrors = fieldErrors
  }
}

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new ApiRequestError(body.message, body.fieldErrors)
  }
  return body.data
}

/**
 * 언론사 목록. `categories`를 지정하면 `?category=a&category=b` 다중 선택 쿼리로 내려간다
 * (Task 026, `app/api/press/route.ts`의 계약과 동일). 미지정 또는 빈 배열이면 전체다.
 */
export async function fetchPressList(categories?: PressCategory[]): Promise<PressSourceWithUrl[]> {
  const params = new URLSearchParams()
  for (const category of categories ?? []) params.append('category', category)
  const query = params.toString()
  const response = await fetch(`/api/press${query ? `?${query}` : ''}`)
  return unwrap<PressSourceWithUrl[]>(response)
}

/**
 * 활성 토글 전용 부분 patch. sourceType을 함께 보내지 않으면 서버가 isActive만 받는
 * 부분 patch로 처리한다(app/api/press/[id]/route.ts의 activeOnlyPatchSchema).
 */
export async function updatePressActive(
  id: string,
  isActive: boolean
): Promise<PressSourceWithUrl> {
  const response = await fetch(`/api/press/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return unwrap<PressSourceWithUrl>(response)
}

export async function createPress(input: PressCreateInput): Promise<PressSourceWithUrl> {
  const response = await fetch('/api/press', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap<PressSourceWithUrl>(response)
}

/**
 * 전체 필드 재저장(방식 전환 포함)용 PATCH. 활성 토글 전용 부분 patch는
 * `updatePressActive`가 이미 담당하므로 여기서는 항상 sourceType을 포함한 완전한
 * 폼 값을 보낸다(app/api/press/[id]/route.ts가 sourceType 유무로 두 경로를 가른다).
 */
export async function updatePress(
  id: string,
  input: PressUpdateInput
): Promise<PressSourceWithUrl> {
  const response = await fetch(`/api/press/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap<PressSourceWithUrl>(response)
}

export async function deletePress(id: string): Promise<void> {
  const response = await fetch(`/api/press/${id}`, { method: 'DELETE' })
  await unwrap<{ id: string }>(response)
}

/**
 * 저장 전 소스 테스트(Task 010B). 실패(비XML 응답·접근 불가·타임아웃·목록 페이지 접근 불가)는
 * `ApiRequestError`로 던져진다 — `source-test-panel.tsx`가 `createPress`/`updatePress`와 같은
 * catch 패턴으로 destructive Alert를 그린다.
 */
export async function testPressSource(
  input: PressSourceTestRequest
): Promise<PressSourceTestResult> {
  const response = await fetch('/api/press/test-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap<PressSourceTestResult>(response)
}
