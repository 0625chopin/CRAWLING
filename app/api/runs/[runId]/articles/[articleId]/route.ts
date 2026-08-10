import fs from 'node:fs/promises'

import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { readArticle } from '@/lib/storage/article-repository'
import { getPress } from '@/lib/storage/press-repository'
import { articlePath } from '@/lib/storage/paths'
import { getRun, RunNotFoundError } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 기사 본문 단건. 화면 설계서 02 §⑤ 본문 미리보기의 데이터 소스다.
 *
 * `readArticle`(Task 007, article-repository.ts)은 파일이 없을 때도 손상됐을 때도 똑같이
 * 평범한 `Error`를 던져 타입으로 구분할 수 없다(run-repository.ts의 `RunNotFoundError`와
 * 달리 전용 클래스가 없다 — 이 파일은 범위 밖이라 고치지 않는다,
 * docs/ISSUES.draft.저장소계층.md에 개선 여지로 남긴다). 그래서 `readArticle`을 부르기 전에
 * `fs.access`로 파일 존재만 먼저 확인해 404를 가른다 — 그 뒤에 readArticle이 던지는 예외는
 * "파일은 있는데 형식이 깨졌다"는 뜻이므로 조용히 삼키지 않고 500으로 넘긴다(docs/CONVENTIONS.md
 * §7 "파일 파싱 실패는 조용히 덮어쓰지 않는다").
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; articleId: string }> }
) {
  const { runId, articleId } = await params

  return withErrorBoundary(async () => {
    try {
      await getRun(runId)
    } catch (error) {
      if (error instanceof RunNotFoundError) {
        return fail(error.message, 404)
      }
      throw error
    }

    try {
      // articlePath는 articleId 형식도 함께 검증한다(경로 순회 문자 등) — 그 검증에서 던지는
      // 예외도 여기서는 "그런 기사는 없다"와 같은 결과이므로 같은 404로 합류시킨다.
      await fs.access(articlePath(runId, articleId))
    } catch {
      return fail('존재하지 않는 기사입니다', 404)
    }

    const article = await readArticle(runId, articleId)
    const press = await getPress(article.pressId)

    return ok({
      id: article.id,
      runId: article.runId,
      pressId: article.pressId,
      pressName: press ? press.name : null,
      pressDeleted: !press,
      title: article.title,
      url: article.url,
      content: article.content,
      contentSource: article.contentSource,
      crawledAt: article.crawledAt,
    })
  }, '기사 본문을 불러오지 못했습니다')
}
