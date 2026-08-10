import { z } from 'zod'

import { fail, fieldErrorsFromZod, ok, withErrorBoundary } from '@/lib/api/response'
import type { HtmlSourceTestResult, RssSourceTestResult } from '@/lib/api/press-client'
import { fetchHtml } from '@/lib/crawler/fetch-html'
import { extractLinks, loadDocument } from '@/lib/crawler/parse'
import { fetchFeed } from '@/lib/crawler/rss'

// Node.js 런타임이 이미 기본값이므로 runtime export를 두지 않는다(docs/CONVENTIONS.md §6,
// node_modules/next/dist/docs/.../route-segment-config/runtime.md가 제거를 지시한다).
// 이 라우트는 페이지 1장만 열거나 피드 하나만 받으므로 요청 안에서 끝내도 무리가 없다
// (docs/ROADMAP.md Task 010 구현 규칙).

/**
 * 소스 테스트 요청 스키마. `lib/types/press.ts`의 `pressCreateSchema`(저장소 계층 소유, Task 004)를
 * 건드리지 않고 이 라우트 안에만 둔다 — 저장 전 검증이라 방식별 필요 최소 필드만 받는다는 점에서도
 * 저장용 스키마와 모양이 다르다(RSS는 피드 URL 하나, HTML은 목록 URL·기사 링크 셀렉터뿐,
 * docs/screens/04-press-manage.md §설계 결정 근거 3). `app/api/press/[id]/route.ts`의
 * `activeOnlyPatchSchema`처럼 라우트 로컬 스키마를 쓰는 전례를 그대로 따른다.
 */
const testSourceRequestSchema = z.discriminatedUnion('sourceType', [
  z.strictObject({
    sourceType: z.literal('rss'),
    feedUrl: z.url('올바른 피드 URL을 입력하세요'),
  }),
  z.strictObject({
    sourceType: z.literal('html'),
    listUrl: z.url('올바른 목록 페이지 URL을 입력하세요'),
    articleLinkSelector: z.string().min(1, '기사 링크 셀렉터를 입력하세요'),
  }),
])

/** 응답 샘플은 최대 3건 + 총 개수만 돌려준다(docs/screens/04-press-manage.md §설계 결정 근거 3). */
const MAX_SAMPLES = 3

function averageSummaryLength(summaries: string[]): number {
  if (summaries.length === 0) return 0
  const total = summaries.reduce((sum, summary) => sum + summary.length, 0)
  return Math.round(total / summaries.length)
}

async function testRssSource(feedUrl: string): Promise<Response> {
  const feedResult = await fetchFeed(feedUrl)
  if (!feedResult.ok) {
    // 비XML 응답·접근 불가·타임아웃 — fetchFeed가 예외 대신 값으로 이미 격리해 두었다.
    return fail(feedResult.error, 400)
  }

  const { items } = feedResult
  const result: RssSourceTestResult = {
    count: items.length,
    avgSummaryLength: averageSummaryLength(items.map((item) => item.summary)),
    samples: items.slice(0, MAX_SAMPLES).map((item) => ({ title: item.title, link: item.link })),
  }
  return ok(result)
}

async function testHtmlSource(listUrl: string, articleLinkSelector: string): Promise<Response> {
  const listPage = await fetchHtml({ url: listUrl })
  if (!listPage.ok) {
    return fail(listPage.error, 400)
  }

  // HTML 경로는 기존 유틸을 재사용한다 — 새 파싱 로직을 쓰지 않는다(구현 규칙).
  const $ = loadDocument(listPage.html)
  const links = extractLinks($, listUrl, articleLinkSelector)

  // 링크 0건("0개 발견")은 요청 자체의 실패가 아니다 — 목록 페이지는 열렸고 셀렉터만 안 맞을
  // 수 있다. count로 그대로 내려주고, destructive Alert 표시 여부는 화면(source-test-panel)이
  // count === 0으로 판단한다.
  const result: HtmlSourceTestResult = {
    count: links.length,
    samples: links.slice(0, MAX_SAMPLES),
  }
  return ok(result)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('JSON 본문을 파싱할 수 없습니다', 400)
  }

  const parsed = testSourceRequestSchema.safeParse(body)
  if (!parsed.success) {
    return fail('입력값을 확인하세요', 400, fieldErrorsFromZod(parsed.error))
  }

  return withErrorBoundary(
    () =>
      parsed.data.sourceType === 'rss'
        ? testRssSource(parsed.data.feedUrl)
        : testHtmlSource(parsed.data.listUrl, parsed.data.articleLinkSelector),
    '소스 테스트에 실패했습니다'
  )
}
