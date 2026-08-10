import type { NextRequest } from 'next/server'

import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import { addStopwords, listStopwords } from '@/lib/storage/stopword-repository'
import { stopwordCreateSchema } from '@/lib/types/stopword'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/** 쉼표·줄바꿈으로 뒤섞인 원시 문자열을 trim + 빈 문자열 제거까지 끝낸 배열로 쪼갠다. */
function splitBulkInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((word) => word.trim())
    .filter((word) => word !== '')
}

/**
 * `words`가 원시 문자열("앵커, 특파원\n인턴기자")로 오든, 클라이언트가 이미 나눈 배열로 오든
 * 여기서 한 번 더 쉼표·줄바꿈 분리를 거친다 — 클라이언트 파싱을 신뢰하지 않는다(docs/ROADMAP.md
 * Task 011 구현 규칙). 분리 후 stopwordCreateSchema(words: string[])가 형식을 검증한다.
 */
function normalizeBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('words' in body)) {
    return body
  }

  const words = (body as { words: unknown }).words

  if (typeof words === 'string') {
    return { ...body, words: splitBulkInput(words) }
  }

  if (Array.isArray(words)) {
    const flattened = words.flatMap((word) =>
      typeof word === 'string' ? splitBulkInput(word) : []
    )
    return { ...body, words: flattened }
  }

  return body
}

export async function GET() {
  return withErrorBoundary(async () => {
    const stopwords = await listStopwords()
    return ok(stopwords)
  }, '불용어 목록을 불러오지 못했습니다')
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('JSON 본문을 파싱할 수 없습니다', 400)
  }

  const parsed = stopwordCreateSchema.safeParse(normalizeBody(body))
  if (!parsed.success) {
    return fail('불용어 입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(async () => {
    // 단건({ word })도 응답 형태를 { added, skipped }로 통일한다(docs/ROADMAP.md Task 011 DoD
    // 1번) — 화면이 단건·일괄을 같은 결과 처리 경로로 다룰 수 있다. addStopwords가 이미
    // 정규화·중복 제거를 수행하므로 단건을 배열 하나로 감싸 그대로 재사용한다.
    const words = 'word' in parsed.data ? [parsed.data.word] : parsed.data.words
    const result = await addStopwords(words)

    return ok(result, result.added.length > 0 ? 201 : 200)
  }, '불용어 추가에 실패했습니다')
}
