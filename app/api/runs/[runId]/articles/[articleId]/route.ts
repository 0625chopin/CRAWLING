import type { Article } from '@/lib/types/article'

import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { ArticleNotFoundError, readArticle } from '@/lib/storage/article-repository'
import { getPress } from '@/lib/storage/press-repository'
import { UnsafePathSegmentError } from '@/lib/storage/paths'
import { getRun, RunNotFoundError } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 기사 본문 단건. 화면 설계서 02 §⑤ 본문 미리보기의 데이터 소스다.
 *
 * `readArticle`(Task 007, article-repository.ts)이 이제 "없음"을 `ArticleNotFoundError`로
 * 던진다(I-020 해소, docs/DECISIONS.draft.크롤파이프라인.md) — 이전에는 파일 없음과 메타 라인
 * 손상을 똑같은 `Error`로 던져 타입으로 구분할 수 없었고, `readArticle` 호출 전에 `fs.access`로
 * 존재만 먼저 확인하는 우회(D-032)가 필요했다. 그 우회를 걷어내고 `readArticle` 호출 한 번으로
 * 줄였다. "손상"(메타 라인 형식 불일치 등)은 여전히 전용 타입이 없는 익명 `Error`이므로 그대로
 * 흘려보내 `withErrorBoundary`가 500으로 받는다(docs/CONVENTIONS.md §7 "파일 파싱 실패는 조용히
 * 덮어쓰지 않는다").
 *
 * articleId에 경로 순회 문자가 섞이면 `articlePath`가 `UnsafePathSegmentError`를 던진다(I-021,
 * D-045) — `articlePath` 조립이 `readArticle` 내부에서 다시 일어나므로 이 catch에서도 나올 수
 * 있다. `ArticleNotFoundError`보다 먼저 가려내지 않으면 경로 순회 입력이 "없는 기사"로
 * 뭉뚱그려진다.
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
      // runId에 경로 순회 문자가 섞인 경우(I-021) — 검증 실패이므로 500이 아니라 400이다.
      if (error instanceof UnsafePathSegmentError) {
        return fail(error.message, 400)
      }
      throw error
    }

    let article: Article
    try {
      article = await readArticle(runId, articleId)
    } catch (error) {
      // articleId에 경로 순회 문자가 섞인 경우(I-021) — ArticleNotFoundError보다 먼저 가려내야
      // "없는 기사"로 뭉뚱그려지지 않는다(D-045).
      if (error instanceof UnsafePathSegmentError) {
        return fail(error.message, 400)
      }
      if (error instanceof ArticleNotFoundError) {
        return fail('존재하지 않는 기사입니다', 404)
      }
      throw error // 손상 — withErrorBoundary가 500으로 받는다
    }

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
