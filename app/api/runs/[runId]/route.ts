import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { formatDurationLabel } from '@/lib/api/run-format'
import { listPress } from '@/lib/storage/press-repository'
import { articlesDisplayPath } from '@/lib/storage/paths'
import { getRun, RunNotFoundError } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 실행 요약 단건. 화면 설계서 02 §③ 실행 요약 카드의 데이터 소스다. 대상 언론사는 id가 아니라
 * 이름으로 내려주되, 삭제된 언론사는 `name: null, deleted: true`다(D-026 — 과거 이름을
 * 스냅샷하지 않기로 확정했으므로 복구하지 않는다).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  return withErrorBoundary(async () => {
    let run
    try {
      run = await getRun(runId)
    } catch (error) {
      // run-meta.json 자체가 없는 진짜 없는 runId(app/api/crawl/[runId]/route.ts와 동일 판정
      // 방식 — RunNotFoundError는 D-022가 확정한 전용 클래스라 문구 매칭이 아니라 타입으로
      // 가른다). 손상된 메타 파일 등 그 외 예외는 다시 던져 바깥 withErrorBoundary의 500으로
      // 넘긴다(docs/CONVENTIONS.md §7 — 파싱 실패를 조용히 덮어쓰지 않는다).
      if (error instanceof RunNotFoundError) {
        return fail(error.message, 404)
      }
      throw error
    }

    // press-sources.json을 한 번만 읽어 Map으로 재사용한다 — 대상 언론사마다 getPress를 부르면
    // 호출마다 파일 전체를 다시 읽는 N+1이 된다(docs/DECISIONS.md D-025 참고 메모).
    const pressList = await listPress()
    const pressMap = new Map(pressList.map((press) => [press.id, press]))

    const targetPress = run.targetPressIds.map((id) => {
      const press = pressMap.get(id)
      return press
        ? { id, name: press.name, deleted: false }
        : { id, name: null, deleted: true }
    })

    return ok({
      id: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationLabel: formatDurationLabel(run.startedAt, run.finishedAt),
      status: run.status,
      targetPress,
      successCount: run.successCount,
      failCount: run.failCount,
      // 중단으로 요청조차 하지 않은 기사 수(I-017). status === 'aborted'가 아니면 보통 0이다.
      // "실패"라는 말로 묶지 않는다 — 화면(018A)이 표현을 어떻게 할지는 이 응답의 책임이 아니다.
      skippedCount: run.skippedCount,
      // Windows에서도 슬래시로 정규화된 프로젝트 루트 상대경로다(I-015 해소, paths.ts).
      storagePath: articlesDisplayPath(run.id),
    })
  }, '실행 요약을 불러오지 못했습니다')
}
