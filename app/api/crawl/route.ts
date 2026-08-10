import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import { RunAlreadyRunningError, startRun } from '@/lib/crawler'
import { listPress } from '@/lib/storage/press-repository'
import { crawlStartRequestSchema } from '@/lib/types/crawl-run'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).
// POST는 애초에 정적 캐시 대상이 아니다(node_modules/next/dist/docs/01-app/01-getting-started/
// 15-route-handlers.md: "Other supported HTTP methods are not cached") — dynamic export도 필요 없다.

/**
 * 언론사 선택 크롤링을 시작한다(F001). 기존 범용 배치 크롤(임의 URL 목록, { url } | { targets })은
 * 화면에서 쓰이지 않고 검증되지 않은 URL을 크롤하는 통로만 남기므로 이번 회차에 완전히 걷어냈다
 * — 핸들러 본문을 통째로 교체한다(docs/ROADMAP.md Task 015 구현 규칙).
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('JSON 본문을 파싱할 수 없습니다', 400)
  }

  const parsed = crawlStartRequestSchema.safeParse(body)
  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(async () => {
    // startRun(run-manager.ts) 자신은 "존재하지 않는 언론사"만 걸러 실패로 기록하고 넘어간다 —
    // "비활성" 언론사는 검사하지 않는다(그대로 두면 비활성 언론사도 정상 크롤된다). 화면의
    // 체크박스 목록은 활성 언론사만 보여주므로(docs/screens/01-crawl-run.md ②) 비활성 id가
    // 섞여 오는 것은 API를 직접 두드리는 비정상 요청뿐이고, 그 방어는 이 경계의 몫이다.
    const activePress = await listPress({ activeOnly: true })
    const activeIds = new Set(activePress.map((press) => press.id))
    const invalidIds = parsed.data.pressIds.filter((id) => !activeIds.has(id))
    if (invalidIds.length > 0) {
      return fail(`비활성이거나 존재하지 않는 언론사입니다: ${invalidIds.join(', ')}`, 400)
    }

    try {
      const { runId } = await startRun(parsed.data)
      // 작업 접수일 뿐 완료가 아니다 — 202로 응답한다(docs/CONVENTIONS.md §6).
      return ok({ runId }, 202)
    } catch (error) {
      // 이미 running인 잡이 레지스트리에 있으면 startRun이 이 타입으로 던진다(D-021).
      // 문자열 접두사로 판정하지 않는다 — instanceof로만 가른다(I-016, D-022).
      if (error instanceof RunAlreadyRunningError) {
        return fail(error.message, 409)
      }
      throw error
    }
  }, '크롤링 시작에 실패했습니다')
}
