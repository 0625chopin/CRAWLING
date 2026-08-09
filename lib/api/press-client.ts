import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { PressCreateInput, PressSource, PressUpdateInput } from '@/lib/types/press'

/**
 * GET /api/press가 내려주는 형태. 서버가 sourceType 분기 없이 쓸 수 있는 대표 URL을
 * 미리 만들어 붙여 준다(app/api/press/route.ts의 withSourceUrl) — 화면은 이 필드를
 * 그대로 쓰고 sourceType 분기를 다시 하지 않는다.
 */
export type PressSourceWithUrl = PressSource & { sourceUrl: string }

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

export async function fetchPressList(): Promise<PressSourceWithUrl[]> {
  const response = await fetch('/api/press')
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
