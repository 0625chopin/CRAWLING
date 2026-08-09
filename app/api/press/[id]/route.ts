import { z } from 'zod'

import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import { deletePress, getPress, updatePress } from '@/lib/storage/press-repository'
import { pressUpdateSchema, type PressSource } from '@/lib/types/press'

import { pressSourceUrl } from '../route'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

// 활성 토글 전용 부분 patch. sourceType이 없는 요청은 이 스키마로만 검증한다 — 방식이 바뀌지
// 않으므로 전체 필드 재수신 없이 isActive만 받는다(docs/ROADMAP.md Task 008 구현 규칙).
const activeOnlyPatchSchema = z.strictObject({ isActive: z.boolean() })

// app/api/press/route.ts(008A)가 export하는 파생 로직을 그대로 재사용한다 — 방식별
// sourceUrl 분기를 여기서 다시 짜지 않는다(팀장 지시).
function withSourceUrl(press: PressSource) {
  return { ...press, sourceUrl: pressSourceUrl(press) }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withErrorBoundary(async () => {
    const press = await getPress(id)
    if (!press) return fail('존재하지 않는 언론사입니다', 404)
    return ok(withSourceUrl(press))
  }, '언론사 조회에 실패했습니다')
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('JSON 본문을 파싱할 수 없습니다', 400)
  }

  // sourceType이 담겨 있으면 방식 전환(또는 전체 수정) 요청이라 전체 필드를 다시 받는다.
  // 없으면 활성 토글(isActive)만 허용하는 부분 patch다(docs/ROADMAP.md Task 008 구현 규칙).
  const isFullReplace =
    typeof body === 'object' && body !== null && 'sourceType' in body

  const parsed = isFullReplace
    ? pressUpdateSchema.safeParse(body)
    : activeOnlyPatchSchema.safeParse(body)

  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(async () => {
    const existing = await getPress(id)
    if (!existing) return fail('존재하지 않는 언론사입니다', 404)

    // D-005: id는 patch에 담겨도 무시된다. pressUpdateSchema는 pressCreateSchema와 같은
    // 형태라 선택 필드 id를 허용하지만, updatePress는 URL 경로의 id(대상 레코드)만 쓰고
    // patch.id는 절대 반영하지 않는다(lib/storage/press-repository.ts).
    const updated = await updatePress(id, parsed.data)
    return ok(withSourceUrl(updated))
  }, '언론사 수정에 실패했습니다')
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withErrorBoundary(async () => {
    const existing = await getPress(id)
    if (!existing) return fail('존재하지 않는 언론사입니다', 404)

    // 언론사 레지스트리에서만 지운다 — 이미 수집된 기사·실행 결과(data/runs/*)는 건드리지
    // 않는다(deletePress 구현, docs/screens/04-press-manage.md §⑤ 삭제 다이얼로그 문구와 일치).
    await deletePress(id)
    return ok({ id })
  }, '언론사 삭제에 실패했습니다')
}
