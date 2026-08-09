import type { NextRequest } from 'next/server'

import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import { createPress, listPress } from '@/lib/storage/press-repository'
import { pressCreateSchema, type PressSource } from '@/lib/types/press'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6,
// node_modules/next/dist/docs/.../route-segment-config/runtime.md가 제거를 지시한다).

/**
 * 목록 응답에 더할 파생 필드. 크롤링 실행 화면(01)의 체크박스 목록은 방식과 무관하게
 * URL 한 줄만 필요하고, 이 분기를 화면마다 반복하지 않기 위해 서버에서 만들어 내려준다
 * (docs/ROADMAP.md Task 008 구현 규칙). 008B의 단건 GET도 이 함수를 그대로 재사용한다.
 */
export function pressSourceUrl(press: PressSource): string {
  return press.sourceType === 'rss' ? press.feedUrl : press.listUrl
}

function withSourceUrl(press: PressSource) {
  return { ...press, sourceUrl: pressSourceUrl(press) }
}

export async function GET(request: NextRequest) {
  const activeOnly = request.nextUrl.searchParams.get('active') === 'true'
  return withErrorBoundary(async () => {
    const pressList = await listPress({ activeOnly })
    return ok(pressList.map(withSourceUrl))
  }, '언론사 목록을 불러오지 못했습니다')
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('JSON 본문을 파싱할 수 없습니다', 400)
  }

  // discriminatedUnion이라 sourceType으로 먼저 가지를 고른 뒤 그 가지의 필드만 검증한다 —
  // RSS로 보냈는데 "기사 링크 셀렉터를 입력하세요"가 나오는 일은 구조적으로 없다.
  const parsed = pressCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(async () => {
    const press = await createPress(parsed.data)
    return ok(withSourceUrl(press), 201)
  }, '언론사 추가에 실패했습니다')
}
