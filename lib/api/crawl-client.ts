import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { PressSourceWithUrl } from '@/lib/api/press-client'
import type { CrawlStartRequest } from '@/lib/types/crawl-run'

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new Error(body.message)
  }
  return body.data
}

/**
 * 활성 언론사 목록(F007 연동). 언론사 관리 화면(`press-client.ts`의 `fetchPressList`)은
 * 전체 목록을 받아 프런트에서 편집하지만, 이 화면은 체크박스에 활성 언론사만 올려야 하므로
 * 쿼리스트링을 고정한 별도 함수로 둔다(`app/api/press/route.ts`의 `active` 쿼리, Task 008A).
 */
export async function fetchActivePressList(): Promise<PressSourceWithUrl[]> {
  const response = await fetch('/api/press?active=true')
  return unwrap<PressSourceWithUrl[]>(response)
}

/**
 * 크롤링 시작(F001). 성공해도 크롤이 끝난 게 아니라 접수된 것뿐이라 서버가 202를 내려주고,
 * 이 함수는 그 응답 바디(`{ runId }`)만 반환한다. 진행 상태는 이 함수가 아니라
 * `hooks/use-crawl-progress.ts`(Task 015B)가 별도로 폴링한다 — 여기서 다시 구현하지 않는다.
 */
export async function startCrawl(input: CrawlStartRequest): Promise<{ runId: string }> {
  const response = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap<{ runId: string }>(response)
}

/**
 * 크롤링 중단(F002). 016A는 이 함수를 호출하지 않는다 — 중단 버튼은 진행 패널
 * (`components/crawl/crawl-run-panel.tsx`, Task 016B)이 붙인다. 그 조각이 새로 fetch 코드를
 * 만들지 않도록 클라이언트 함수만 미리 갖춰 둔다.
 */
export async function abortCrawl(runId: string): Promise<{ runId: string }> {
  const response = await fetch(`/api/crawl/${runId}/abort`, { method: 'POST' })
  return unwrap<{ runId: string }>(response)
}
