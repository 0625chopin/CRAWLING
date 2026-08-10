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
const keywordsFileSchema = z.object({
  runId: z.string().min(1),
  analyzedAt: z.iso.datetime({ offset: true }),
  summary: analysisSummarySchema,
  items: z.array(keywordCountSchema),
})
export type KeywordsFile = z.infer<typeof keywordsFileSchema>

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
