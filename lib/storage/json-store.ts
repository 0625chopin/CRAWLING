import 'server-only'

import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { ZodType } from 'zod'

/** 디렉터리가 없으면 재귀적으로 만든다. 이미 있으면 조용히 통과한다(mkdir recursive 기본 동작). */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

/**
 * 임시 파일에 먼저 쓰고 fs.rename으로 교체하는 원자적 쓰기다. 같은 파일시스템 안에서
 * rename은 원자적이라, 쓰는 도중 프로세스가 죽어도 대상 경로에는 "이전 파일 그대로" 아니면
 * "아무것도 없음"만 있고 부분 기록된 내용이 노출되지 않는다. 백그라운드 크롤 잡이
 * run-meta.json을 갱신하는 동안 화면이 같은 파일을 읽는 상황을 위한 설계다(docs/ROADMAP.md Task 005).
 *
 * content-agnostic하게 분리해 둔다 — JSON뿐 아니라 기사 txt(메타 라인 + 본문)처럼 크래시 안전성이
 * 필요한 다른 파일 포맷도 이 헬퍼 하나로 같은 보장을 받는다. 같은 패턴을 호출부마다 다시 짜면
 * 한쪽만 고쳐지는 사고가 나므로 여기 한 곳에 모은다(2일차 교차검증 이슈).
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath))

  const tempPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(tempPath, content, 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    // rename 전에 죽었다면 temp 파일만 남는다 — 대상 파일은 건드리지 않았으므로 정리만 시도한다.
    await fs.rm(tempPath, { force: true }).catch(() => {})
    throw error
  }
}

export async function writeJson<T>(filePath: string, value: T): Promise<void> {
  await atomicWriteFile(filePath, JSON.stringify(value, null, 2))
}

/**
 * 파일이 없으면 fallback을 기록하고 그대로 반환한다(data/가 git에 없어 첫 실행엔 항상 없음).
 * 파싱·스키마 검증 실패는 삼키지 않고 던진다 — 사용자가 손으로 고친 JSON을
 * fallback으로 조용히 덮어쓰면 안 된다(docs/CONVENTIONS.md §7).
 */
export async function readJson<T>(filePath: string, schema: ZodType<T>, fallback: T): Promise<T> {
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    if (isNotFoundError(error)) {
      await writeJson(filePath, fallback)
      return fallback
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`파일을 읽는 중 JSON 형식이 올바르지 않습니다: ${filePath}`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`파일 내용이 예상한 형식과 다릅니다: ${filePath}`)
  }
  return result.data
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}
