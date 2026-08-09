import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { PressSource } from '@/lib/types/press'

/**
 * GET /api/press가 내려주는 형태. 서버가 sourceType 분기 없이 쓸 수 있는 대표 URL을
 * 미리 만들어 붙여 준다(app/api/press/route.ts의 withSourceUrl) — 화면은 이 필드를
 * 그대로 쓰고 sourceType 분기를 다시 하지 않는다.
 */
export type PressSourceWithUrl = PressSource & { sourceUrl: string }

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new Error(body.message)
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

// 추가·수정·삭제(전체 필드 저장) fetch 래퍼는 Task 009B(추가·수정·삭제 다이얼로그)가
// 이 파일에 이어 붙인다.
