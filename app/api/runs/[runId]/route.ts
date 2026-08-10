import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { formatDurationLabel } from '@/lib/api/run-format'
import { listPress } from '@/lib/storage/press-repository'
import { articlesDisplayPath, UnsafePathSegmentError } from '@/lib/storage/paths'
import { getRun, RunNotFoundError } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 실행 요약 단건. 화면 설계서 02 §③ 실행 요약 카드의 데이터 소스다. 대상 언론사는 id가 아니라
 * 이름으로 내려주되, 삭제된 언론사는 `name: null, deleted: true`다(D-026 — 과거 이름을
 * 스냅샷하지 않기로 확정했으므로 복구하지 않는다).
 *
 * `targetCategories`(Task 026, 크롤 파이프라인이 Task 027에서 만든 `CrawlRun.targetCategories`
 * 스냅샷을 그대로 실어 보낸다)는 **그대로 통과시키기만 한다 — 해석하지 않는다.** 빈 배열의 뜻은
 * "전체 카테고리"가 아니다(`lib/storage/run-repository.ts`의 `createRun` 주석: 카테고리로 고르지
 * 않고 언론사를 직접 선택했거나, 이 필드가 생기기 전의 과거 run이라는 뜻이다). 그 해석·표시
 * 방식(행을 숨길지, "카테고리 미지정"으로 보여줄지)은 화면의 몫이다 — 여기서 빈 배열을 다른
 * 값으로 바꾸거나 기본값을 채우지 않는다.
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
      // runId에 경로 순회 문자가 섞인 경우(I-021) — 검증 실패이므로 500이 아니라 400이다.
      if (error instanceof UnsafePathSegmentError) {
        return fail(error.message, 400)
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
      // 해석하지 않고 그대로 통과시킨다 — 위 docstring 참고. 빈 배열 ≠ "전체".
      targetCategories: run.targetCategories,
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
