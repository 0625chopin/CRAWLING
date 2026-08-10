import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { abortRun, RunNotAbortableError, RunNotFoundError } from '@/lib/crawler'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 진행 중인 실행을 중단한다(F002). 실제 정지는 `abortRun`(Task 014B)이 세우는 플래그를 크롤
 * 루프(`press-crawler.ts`의 `collectArticlePages`)가 다음 요청 직전에 읽어 처리한다 — 이미
 * 시작된 요청은 강제로 죽이지 않는다. 이 라우트는 요청을 접수해 run 생명주기 예외를 상태
 * 코드로 바꾸는 경계일 뿐이다.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  return withErrorBoundary(async () => {
    try {
      await abortRun(runId)
      return ok({ runId })
    } catch (error) {
      // 레지스트리에도 run-meta.json에도 없는 runId(run-repository.ts의 readRunMeta가 던진다).
      if (error instanceof RunNotFoundError) {
        return fail(error.message, 404)
      }
      // 이미 종료된(running이 아닌) run을 다시 중단하려는 요청. 409로 매핑한다 — "이미 실행
      // 중"이라 거절하는 RunAlreadyRunningError(→409, run.ts)와 대칭인 상태 충돌이다: 요청
      // 형식은 유효하지만 run의 현재 상태와 부딪힌다. 근거는 docs/DECISIONS.draft.크롤파이프라인.md
      // (D-022가 이 판단을 015A에 열어 두었다).
      if (error instanceof RunNotAbortableError) {
        return fail(error.message, 409)
      }
      throw error
    }
  }, '크롤링 중단에 실패했습니다')
}
