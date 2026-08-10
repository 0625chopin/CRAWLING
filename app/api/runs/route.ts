import { ok, withErrorBoundary } from '@/lib/api/response'
import { buildRunListLabel } from '@/lib/api/run-format'
import { listRuns } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 실행 목록(최신순). 화면 설계서 02 §② 실행 선택 Select 옵션의 데이터 소스다. `listRuns()`가
 * 이미 startedAt 내림차순으로 정렬해 돌려주므로 여기서 다시 정렬하지 않는다.
 */
export async function GET() {
  return withErrorBoundary(async () => {
    const runs = await listRuns()

    // 실행 이력 0건이면 listRuns()가 이미 빈 배열을 돌려준다(run-repository.ts, ENOENT 분기) —
    // 이 라우트는 그 값을 그대로 ok()에 실어 보내면 되고 별도 방어가 필요 없다(Task 017 DoD ①).
    const items = runs.map((run) => ({
      id: run.id,
      label: buildRunListLabel({
        startedAt: run.startedAt,
        targetPressCount: run.targetPressIds.length,
        successCount: run.successCount,
        failCount: run.failCount,
      }),
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      targetPressCount: run.targetPressIds.length,
      successCount: run.successCount,
      // 중단으로 요청조차 하지 않은 기사 수(I-017). failCount와 절대 합치지 않는다 —
      // buildRunListLabel도 이 필드를 아예 입력받지 않으므로 라벨 문구에도 섞일 수 없다.
      failCount: run.failCount,
      skippedCount: run.skippedCount,
    }))

    return ok(items)
  }, '실행 목록을 불러오지 못했습니다')
}
