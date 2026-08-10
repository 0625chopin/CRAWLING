import 'server-only'

import { z } from 'zod'

import { stopwordSchema, type Stopword } from '@/lib/types/stopword'

import { readJson, writeJson } from './json-store'
import { stopwordsPath } from './paths'
import { DEFAULT_STOPWORDS } from './stopword-defaults'

const stopwordListSchema = z.array(stopwordSchema)

function formatStopwordId(sequence: number): string {
  return `sw-${String(sequence).padStart(4, '0')}`
}

function buildDefaultSeed(): Stopword[] {
  return DEFAULT_STOPWORDS.map((word, index) => ({
    id: formatStopwordId(index + 1),
    word,
    isDefault: true,
  }))
}

/**
 * 저장된 id 중 가장 큰 순번의 다음 번호를 돌려준다. 삭제로 빈 번호가 생겨도 재사용하지
 * 않는다 — 재사용하면 예전에 지운 불용어와 새로 추가한 불용어가 같은 id를 공유하게 된다.
 */
function nextStopwordId(existing: Stopword[]): string {
  const maxSequence = existing.reduce((max, item) => {
    const match = /^sw-(\d{4})$/.exec(item.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return formatStopwordId(maxSequence + 1)
}

/** 대소문자·앞뒤 공백을 지운 비교용 형태다. 저장되는 word 자체는 원래 대소문자를 유지한다. */
function normalize(word: string): string {
  return word.trim().toLowerCase()
}

async function loadAll(): Promise<Stopword[]> {
  return readJson(stopwordsPath(), stopwordListSchema, buildDefaultSeed())
}

export async function listStopwords(): Promise<Stopword[]> {
  return loadAll()
}

export type AddStopwordResult =
  | { status: 'added'; stopword: Stopword }
  | { status: 'duplicate'; word: string }

/**
 * 단어 하나를 추가한다. 대소문자·앞뒤 공백을 정규화해 중복을 검사하고, 중복이면
 * 저장하지 않은 채 값으로 알린다(docs/ROADMAP.md Task 006 구현 규칙).
 */
export async function addStopword(word: string): Promise<AddStopwordResult> {
  const trimmed = word.trim()
  const stopwords = await loadAll()

  const isDuplicate = stopwords.some(
    (item) => normalize(item.word) === normalize(trimmed)
  )
  if (isDuplicate) {
    return { status: 'duplicate', word: trimmed }
  }

  const stopword: Stopword = {
    id: nextStopwordId(stopwords),
    word: trimmed,
    isDefault: false,
  }
  await writeJson(stopwordsPath(), [...stopwords, stopword])
  return { status: 'added', stopword }
}

export interface AddStopwordsResult {
  added: Stopword[]
  skipped: string[]
}

/**
 * 여러 단어를 한 번에 추가한다. 이미 저장된 단어뿐 아니라 같은 배치 안에서 중복 입력된
 * 단어("특파원, 특파원")도 걸러낸다 — 클라이언트 파싱을 신뢰하지 않고 서버에서 한 번 더
 * 정규화·중복 검사를 한다(docs/ROADMAP.md Task 011 구현 규칙과 동일한 전제).
 */
export async function addStopwords(
  words: string[]
): Promise<AddStopwordsResult> {
  const stopwords = await loadAll()
  const added: Stopword[] = []
  const skipped: string[] = []

  for (const raw of words) {
    const trimmed = raw.trim()
    if (trimmed === '') continue

    const isDuplicate =
      stopwords.some((item) => normalize(item.word) === normalize(trimmed)) ||
      added.some((item) => normalize(item.word) === normalize(trimmed))

    if (isDuplicate) {
      skipped.push(trimmed)
      continue
    }

    added.push({
      id: nextStopwordId([...stopwords, ...added]),
      word: trimmed,
      isDefault: false,
    })
  }

  if (added.length > 0) {
    await writeJson(stopwordsPath(), [...stopwords, ...added])
  }

  return { added, skipped }
}

/**
 * 기본 프리셋도 삭제 가능하다 — `Stopword`에 활성 플래그가 없어 배열에서 완전히 제거하는
 * 것이 유일한 삭제 방법이다(docs/ROADMAP.md Task 006 구현 규칙). 재조회 시 시드가 되살리지
 * 않는 이유는 `readJson`이 파일이 이미 있으면 fallback을 쓰지 않기 때문이다(json-store.ts).
 */
export async function deleteStopword(id: string): Promise<void> {
  const stopwords = await loadAll()
  const next = stopwords.filter((item) => item.id !== id)
  if (next.length === stopwords.length) return
  await writeJson(stopwordsPath(), next)
}

/** Phase 5 집계가 O(1) 조회로 쓰는 조회 전용 뷰. */
export async function getStopwordSet(): Promise<Set<string>> {
  const stopwords = await loadAll()
  return new Set(stopwords.map((item) => item.word))
}
