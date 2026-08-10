import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { deleteStopword, listStopwords } from '@/lib/storage/stopword-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withErrorBoundary(async () => {
    // deleteStopword는 없는 id를 조용히 무시한다(lib/storage/stopword-repository.ts) — 존재
    // 여부를 API가 먼저 확인해야 "없는 리소스 404"(docs/CONVENTIONS.md §6) 구분이 생긴다.
    const stopwords = await listStopwords()
    const exists = stopwords.some((item) => item.id === id)
    if (!exists) {
      return fail('존재하지 않는 불용어입니다', 404)
    }

    await deleteStopword(id)
    return ok({ id })
  }, '불용어 삭제에 실패했습니다')
}
