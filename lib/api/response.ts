import { NextResponse } from 'next/server'
import type { z } from 'zod'

/**
 * 모든 API 라우트가 공유하는 응답 봉투. 라우트마다 다른 형태를 만들지 않는다
 * (docs/CONVENTIONS.md §6). 성공은 `ok(data)`, 실패는 `fail(message, status)`.
 */
export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  message: string
  /** 필드별 한국어 오류 메시지. 화면이 입력 필드 하단에 그대로 쓴다(docs/CONVENTIONS.md §6). */
  fieldErrors?: Record<string, string>
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status })
}

export function fail(
  message: string,
  status: number,
  fieldErrors?: Record<string, string>
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, message, ...(fieldErrors ? { fieldErrors } : {}) },
    { status }
  )
}

// zod v4는 필드가 통째로 비어 있을 때(undefined) .min() 등에 넘긴 한국어 메시지 대신
// 기본 영문 메시지("Invalid input: expected string, received undefined")를 낸다 — 그
// 필드에 커스텀 메시지가 타입 검사 자체가 아니라 부가 체크(.min 등)에만 붙어 있기 때문이다.
// CONVENTIONS §6("검증 실패 메시지는 필드별 한국어 문구")를 지키기 위해, 한글이 전혀 없는
// zod 기본 메시지는 여기서 일반화된 한국어 문구로 바꿔치기한다.
const HANGUL_PATTERN = /[가-힣]/

function toKoreanMessage(message: string, field: string): string {
  return HANGUL_PATTERN.test(message) ? message : `${field} 값을 확인하세요`
}

/**
 * zod 검증 실패를 `{ 필드명: 한국어 메시지 }` 형태로 펼친다. 필드 하나에 이슈가 여러 개면
 * 첫 번째 메시지만 남긴다 — 화면은 필드당 오류 문구 하나만 표시한다.
 */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_root'
    if (field in fieldErrors) continue
    fieldErrors[field] = toKoreanMessage(issue.message, field)
  }
  return fieldErrors
}

/**
 * 예상 밖 예외(디스크 쓰기 실패 등)의 경계다. 원시 오류(스택·영문 메시지)를 응답에 그대로
 * 싣지 않는다 — 화면까지 새어 나가면 CONVENTIONS §7("사용자에게 보여줄 수 없는 원시 오류를
 * 화면까지 흘리지 않는다. 경계에서 한국어 메시지로 바꾼다")을 어긴다. 원문은 서버 콘솔에만
 * 남기고, 응답은 항상 `fail(fallbackMessage, 500)` 형태의 정상적인 API 봉투로 나간다 —
 * 이게 없으면 Next.js 기본 오류 응답이 나가 `{ ok, ... }`를 기대하는 화면 쪽이 깨진다.
 *
 * 라우트 핸들러는 zod 검증(400)까지 마친 뒤, 저장소 호출 이후의 처리를 이 함수로 감싼다.
 * 이후 새로 만드는 라우트(008B·015A·017·021B 등)도 같은 형태를 재사용한다.
 */
export async function withErrorBoundary(
  fn: () => Promise<Response>,
  fallbackMessage: string
): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    console.error(error)
    return fail(fallbackMessage, 500)
  }
}
