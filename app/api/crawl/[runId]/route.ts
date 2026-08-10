import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { getRunProgress, RunNotFoundError } from '@/lib/crawler'
import { UnsafePathSegmentError } from '@/lib/storage/paths'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).
// GET Route Handler는 이 Next.js 버전에서 기본이 이미 캐시되지 않으므로(설치본 문서
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:51) dynamic
// export를 따로 두지 않는다 — app/api/press/[id]/route.ts의 GET과 같은 판단이다.

/**
 * 진행 상태 폴링 라우트. `hooks/use-crawl-progress.ts`가 1초 간격으로 호출한다(Q2 결정).
 * 조회 로직 자체는 `getRunProgress` 하나로 위임한다 — 레지스트리 조회·서버 재시작 복구(디스크
 * fallback)·고아 run의 aborted 확정은 전부 크롤 파이프라인(014B)의 몫이라 여기서 흉내 내지 않는다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  return withErrorBoundary(async () => {
    try {
      const progress = await getRunProgress(runId)
      return ok(progress)
    } catch (error) {
      // 레지스트리에도 없고 run-meta.json도 없는 진짜 없는 runId는 run-repository.ts의
      // readRunMeta가 ENOENT 분기에서 RunNotFoundError로 던진다(recoverRunProgress → getRun →
      // readRunMeta 경로) — `lib/crawler` 배럴이 재수출하므로 타입으로 판정한다(문자열 매칭이던
      // 이전 판정은 크롤 파이프라인이 전용 클래스를 export하면서 폐기됐다, 8일차 교차검증 반영).
      // 메시지는 이미 한국어("실행을 찾을 수 없습니다: {runId}")라 그대로 내려준다. 손상된 메타
      // 파일 등 그 외 예외는 다시 던져 바깥 withErrorBoundary의 500 처리로 넘긴다(docs/CONVENTIONS.md
      // §7 — 파싱 실패를 조용히 덮어쓰지 않는다).
      if (error instanceof RunNotFoundError) {
        return fail(error.message, 404)
      }
      // runId에 경로 순회 문자가 섞인 경우. paths.ts의 assertSafeSegment가 던진다 — 저장소
      // 계층이 I-021로 확정한 매핑과 같은 형태다(docs/DECISIONS.draft.저장소계층.md).
      if (error instanceof UnsafePathSegmentError) {
        return fail(error.message, 400)
      }
      throw error
    }
  }, '진행 상태 조회에 실패했습니다')
}
