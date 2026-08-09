import { NextResponse, type NextRequest } from 'next/server'

import {
  crawlRequestSchema,
  crawlTargetSchema,
  runCrawl,
  type CrawlTarget,
} from '@/lib/crawler'

// Playwright는 네이티브 바이너리를 실행하므로 Edge 런타임에서 동작하지 않는다.
export const runtime = 'nodejs'
// 크롤은 빌드 타임에 캐시될 수 없다.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 단건 { url } 과 배치 { targets: [...] } 요청을 모두 받는다.
 * 단건도 내부적으로는 targets 배열 하나로 정규화해 경로를 하나로 유지한다.
 */
function normalizeBody(
  body: unknown
): { targets: CrawlTarget[]; concurrency?: number } | { error: string } {
  const batch = crawlRequestSchema.safeParse(body)
  if (batch.success) {
    return { targets: batch.data.targets, concurrency: batch.data.concurrency }
  }

  const single = crawlTargetSchema.safeParse(body)
  if (single.success) {
    return { targets: [single.data] }
  }

  return {
    error: single.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join(', '),
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON 본문을 파싱할 수 없습니다' },
      { status: 400 }
    )
  }

  const normalized = normalizeBody(body)
  if ('error' in normalized) {
    return NextResponse.json(
      { ok: false, error: normalized.error },
      { status: 400 }
    )
  }

  try {
    const results = await runCrawl(normalized.targets, {
      concurrency: normalized.concurrency,
    })

    const succeeded = results.filter((result) => result.ok).length

    return NextResponse.json({
      ok: true,
      summary: {
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
      },
      // HTML 원문은 응답을 크게 만들므로 길이만 남기고 잘라낸다.
      // 전체 HTML이 필요하면 이 라우트를 감싸는 파이프라인에서 직접 runCrawl을 호출한다.
      results: results.map((result) =>
        result.ok
          ? {
              ok: true as const,
              url: result.url,
              finalUrl: result.finalUrl,
              status: result.status,
              title: result.title,
              htmlLength: result.html.length,
              elapsedMs: result.elapsedMs,
            }
          : result
      ),
    })
  } catch (error) {
    // 브라우저 기동 실패 등 배치 전체를 무너뜨리는 오류만 여기로 온다.
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
