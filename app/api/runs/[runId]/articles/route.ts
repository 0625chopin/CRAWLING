import type { NextRequest } from 'next/server'

import { matchesArticleQuery } from '@/lib/api/article-search'
import { fail, ok, withErrorBoundary } from '@/lib/api/response'
import { listArticles } from '@/lib/storage/article-repository'
import { listPress } from '@/lib/storage/press-repository'
import { UnsafePathSegmentError } from '@/lib/storage/paths'
import { getRun, RunNotFoundError } from '@/lib/storage/run-repository'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6).

/**
 * 기사 파일 목록(본문 미포함). 화면 설계서 02 §④ 기사 파일 목록의 데이터 소스다.
 *
 * `listArticles(runId)`는 디렉터리가 없으면 예외 대신 빈 배열을 돌려준다(article-repository.ts
 * 주석 — "아직 기사가 하나도 저장되지 않은 실행"). 그래서 이 라우트가 listArticles만 불렀다면
 * 존재하지 않는 runId도 200 + 빈 배열이 나가 Task 017 DoD("없는 runId는 404")를 어긴다.
 * `getRun(runId)`로 run 자체의 존재를 먼저 확인해 이 구멍을 막는다(docs/run-api-schema.draft.md
 * §3에서 미리 짚어 둔 함정).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const query = request.nextUrl.searchParams.get('q') ?? ''

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

    // listArticles는 본문을 읽지 않는다(Task 007 DoD) — 이 라우트도 그 계약을 그대로 넘겨받는다.
    // press-sources.json은 기사마다 다시 읽지 않고 한 번만 불러 Map으로 재사용한다(D-025 참고 메모).
    const [articles, pressList] = await Promise.all([listArticles(runId), listPress()])
    const pressMap = new Map(pressList.map((press) => [press.id, press]))

    const items = articles
      .map((article) => {
        const press = pressMap.get(article.pressId)
        return {
          id: article.id,
          fileName: `${article.id}.txt`,
          pressId: article.pressId,
          pressName: press ? press.name : null,
          pressDeleted: !press,
          title: article.title,
          contentSource: article.contentSource,
          crawledAt: article.crawledAt,
        }
      })
      // 검색은 파일명·제목 대상 대소문자 무시(ROADMAP 구현 규칙). pressName 등 다른 필드는
      // 대상이 아니다 — matchesArticleQuery의 계약과 그대로 맞춘다.
      .filter((entry) => matchesArticleQuery(entry, query))

    return ok({ items, total: items.length })
  }, '기사 목록을 불러오지 못했습니다')
}
