import 'server-only'

import fs from 'node:fs/promises'

import { z } from 'zod'

import { analysisSummarySchema, keywordCountSchema } from '@/lib/types/keyword'

import { writeJson } from './json-store'
import { keywordsPath } from './paths'

/**
 * keywords.json의 전체 파일 구조(ROADMAP Task 007이 확정): `{ runId, analyzedAt, summary, items }`.
 * items는 불용어·1글자 필터까지 적용한 전체 집계이고, 최소 등장 횟수·품사·Top N은 담지 않는다
 * (Top N 등 화면 전용 파생은 Task 021의 몫이다).
 */
/**
 * `items[].count`가 무엇을 센 값인지 표시하는 마커. 지금은 `'article'`(언급 기사 수) 하나뿐이다.
 *
 * 23일차까지 이 파일들은 **총 등장 횟수**를 담고 있었다(같은 기사에서 10번 나오면 10). 집계
 * 기준이 언급 기사 수로 바뀌었는데(`lib/keyword/aggregate.ts`) 두 값은 모양이 같은 숫자라, 이
 * 마커가 없으면 옛 캐시가 새 기준인 척 그대로 읽혀 랭킹이 조용히 틀린 채 표시된다 — 값이 아니라
 * **의미**가 바뀐 마이그레이션이라 형식 검증만으로는 걸러낼 수 없다.
 *
 * 필드를 optional로 둔 것은 옛 파일을 **읽을 수 있게** 하기 위해서다(필수로 만들면 스키마 검증에
 * 걸려 "형식이 다릅니다" 예외가 나고, 그건 손상 파일에나 어울리는 반응이다). 값이 없는 파일은
 * `analyzeRun`이 "옛 기준 캐시"로 판정해 그 자리에서 다시 분석하고 덮어쓴다.
 */
const countBasisSchema = z.literal('article')

const keywordsFileSchema = z.object({
  runId: z.string().min(1),
  analyzedAt: z.iso.datetime({ offset: true }),
  countBasis: countBasisSchema.optional(),
  summary: analysisSummarySchema,
  items: z.array(keywordCountSchema),
})
export type KeywordsFile = z.infer<typeof keywordsFileSchema>

/** 지금 코드가 만들어 내는 집계 기준. `analyzeRun`이 캐시 유효성을 이 값과 비교해 판정한다. */
export const CURRENT_COUNT_BASIS = 'article' as const

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

/** 존재하지 않으면 "아직 분석되지 않음"으로 명확히 구분한다 — 빈 결과를 조용히 만들어내지 않는다. */
export async function readKeywords(runId: string): Promise<KeywordsFile> {
  let raw: string
  try {
    raw = await fs.readFile(keywordsPath(runId), 'utf-8')
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`아직 키워드 분석 결과가 없습니다: ${runId}`)
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`키워드 결과 파일 형식이 올바르지 않습니다: ${runId}`)
  }

  const result = keywordsFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`키워드 결과 파일 내용이 예상한 형식과 다릅니다: ${runId}`)
  }
  return result.data
}

export async function writeKeywords(runId: string, payload: KeywordsFile): Promise<void> {
  if (payload.runId !== runId) {
    throw new Error(
      `키워드 결과의 runId(${payload.runId})가 대상 실행(${runId})과 일치하지 않습니다`
    )
  }
  const validated = keywordsFileSchema.parse(payload)
  await writeJson(keywordsPath(runId), validated)
}

export async function hasKeywords(runId: string): Promise<boolean> {
  try {
    await fs.access(keywordsPath(runId))
    return true
  } catch {
    return false
  }
}
