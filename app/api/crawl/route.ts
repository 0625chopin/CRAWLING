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
 *
 * **카테고리 선택(Task 027)**: `categories`로도 대상을 고를 수 있다 — 이 라우트가 활성 언론사
 * 목록에서 해당 카테고리만 골라 `pressIds`와 합친 뒤 `startRun`을 부른다. 화면은 아직 `pressIds`만
 * 보낸다(범위 밖 — 화면 워크스트림 몫); 지금은 API를 직접 호출하는 경로로만 쓰인다.
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

    const explicitPressIds = parsed.data.pressIds ?? []
    const invalidIds = explicitPressIds.filter((id) => !activeIds.has(id))
    if (invalidIds.length > 0) {
      return fail(`비활성이거나 존재하지 않는 언론사입니다: ${invalidIds.join(', ')}`, 400)
    }

    // 카테고리로 고른 대상은 활성 언론사 목록에서 바로 골라내므로(Task 027) 별도의 활성/존재
    // 검사가 필요 없다 — listPress({ activeOnly: true })가 이미 그 조건을 만족하는 것만 돌려준다.
    const categories = parsed.data.categories ?? []
    const categoryPressIds =
      categories.length > 0
        ? activePress.filter((press) => categories.includes(press.category)).map((press) => press.id)
        : []

    const pressIds = [...new Set([...explicitPressIds, ...categoryPressIds])]
    if (pressIds.length === 0) {
      return fail('선택한 카테고리에 활성 언론사가 없습니다. 언론사 관리에서 해당 카테고리의 언론사를 등록하거나 활성화하세요.', 400)
    }

    try {
      const { runId } = await startRun({ pressIds, maxArticlesPerPress: parsed.data.maxArticlesPerPress, categories })
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
