import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { Stopword } from '@/lib/types/stopword'

/**
 * 불용어 추가 API의 공통 응답 형태. 단건({ word })이든 일괄({ words })이든 서버가 같은
 * 모양으로 돌려준다(docs/ROADMAP.md Task 011 DoD) — 화면은 입력 형태와 무관하게 이 결과
 * 하나만 다루면 된다.
 */
export interface StopwordAddResult {
  added: Stopword[]
  skipped: string[]
}

/** 서버 오류 메시지를 그대로 던진다 — 화면 쪽 catch에서 토스트·Alert에 바로 쓸 수 있다. */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure
  if (!body.ok) {
    throw new Error(body.message)
  }
  return body.data
}

export async function fetchStopwords(): Promise<Stopword[]> {
  const response = await fetch('/api/stopwords')
  return unwrap<Stopword[]>(response)
}

export async function addStopword(word: string): Promise<StopwordAddResult> {
  const response = await fetch('/api/stopwords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  })
  return unwrap<StopwordAddResult>(response)
}

/**
 * 일괄 추가. 쉼표·줄바꿈 분리는 서버가 한 번 더 수행하므로(Task 011 구현 규칙) 여기서는
 * 원시 문자열을 그대로 보내도 되지만, 화면이 이미 분리한 배열을 넘겨도 동작한다.
 */
export async function addStopwords(words: string[] | string): Promise<StopwordAddResult> {
  const response = await fetch('/api/stopwords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  })
  return unwrap<StopwordAddResult>(response)
}

export async function deleteStopword(id: string): Promise<void> {
  const response = await fetch(`/api/stopwords/${id}`, { method: 'DELETE' })
  await unwrap<{ id: string }>(response)
}
