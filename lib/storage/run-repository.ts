import 'server-only'

import fs from 'node:fs/promises'

import { crawlRunSchema, type CrawlRun, type CrawlRunStatus } from '@/lib/types/crawl-run'

import { ensureDir, writeJson } from './json-store'
import { articlesDir, runDir, runMetaPath, runsRootDir } from './paths'

/**
 * 존재하지 않는 runId를 나타내는 전용 타입. `readRunMeta`가 유일한 발생지다. 이전에는 같은
 * 문구("실행을 찾을 수 없습니다: ...")를 가진 평범한 `Error`였는데, 소비자(`app/api/crawl/[runId]/
 * route.ts`)가 `error.message.startsWith(...)`로 404를 판정하고 있어 문구를 다듬는 순간 조용히
 * 500으로 바뀌는 위험이 있었다(8일차 교차검증 후속). 문구는 화면이 그대로 노출하므로 바꾸지
 * 않았다 — 판정 수단만 타입으로 옮긴다.
 */
export class RunNotFoundError extends Error {
  constructor(public readonly runId: string) {
    super(`실행을 찾을 수 없습니다: ${runId}`)
    this.name = 'RunNotFoundError'
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** `YYYYMMDDHHmmss`가 아니라 로컬 시각 각 구성요소를 직접 읽는다 — UTC 변환 없이 기기의 로컬 시각을 그대로 쓴다. */
function formatLocalRunTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

/**
 * `YYYYMMDD-HHmmss` 기준으로 폴더가 이미 있으면(같은 초에 두 번째 실행) 접미 숫자를 붙인다
 * (docs/CONVENTIONS.md §식별자 규칙 — CrawlRun).
 */
async function allocateRunId(): Promise<string> {
  const base = formatLocalRunTimestamp(new Date())
  if (!(await pathExists(runDir(base)))) return base

  let suffix = 2
  while (await pathExists(runDir(`${base}-${suffix}`))) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

/**
 * run-meta.json을 읽어 검증한다. 존재하지 않는 runId는 "찾을 수 없음"으로 명확히 구분하고,
 * 손상된 JSON·스키마 불일치는 삼키지 않고 던진다(docs/CONVENTIONS.md §7).
 */
async function readRunMeta(runId: string): Promise<CrawlRun> {
  let raw: string
  try {
    raw = await fs.readFile(runMetaPath(runId), 'utf-8')
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new RunNotFoundError(runId)
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`실행 메타 파일 형식이 올바르지 않습니다: ${runId}`)
  }

  const result = crawlRunSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`실행 메타 파일 내용이 예상한 형식과 다릅니다: ${runId}`)
  }
  return result.data
}

/** 새 실행을 만든다. `articles/` 디렉터리까지 함께 만들어 이후 saveArticle이 바로 쓸 수 있게 한다. */
export async function createRun(targetPressIds: string[]): Promise<CrawlRun> {
  const id = await allocateRunId()
  const run = crawlRunSchema.parse({
    id,
    targetPressIds,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
    status: 'running',
  })

  await ensureDir(articlesDir(id))
  await writeJson(runMetaPath(id), run)
  return run
}

/**
 * 전체 실행 목록을 최신순으로 돌려준다(화면 설계서 02의 셀렉터 기본값 = 최신 run).
 * run-meta.json 1건이 손상돼도 나머지 목록 조회를 막지 않는다(값 격리 원칙, docs/CONVENTIONS.md §7).
 */
export async function listRuns(): Promise<CrawlRun[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(runsRootDir())
  } catch (error) {
    if (isNotFoundError(error)) return [] // 아직 크롤링을 한 번도 실행하지 않은 최초 상태
    throw error
  }

  const runs = await Promise.all(
    entries.map(async (runId) => {
      try {
        return await readRunMeta(runId)
      } catch {
        return null
      }
    })
  )

  return runs
    .filter((run): run is CrawlRun => run !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getRun(runId: string): Promise<CrawlRun> {
  return readRunMeta(runId)
}

/** 부분 갱신. id는 patch로 바꿀 수 없다(폴더명과 묶여 있는 값이라 타입에서부터 제외한다). */
export async function updateRunMeta(
  runId: string,
  patch: Partial<Omit<CrawlRun, 'id'>>
): Promise<CrawlRun> {
  const current = await readRunMeta(runId)
  const merged = crawlRunSchema.parse({ ...current, ...patch, id: current.id })
  await writeJson(runMetaPath(runId), merged)
  return merged
}

/**
 * 실행을 마무리한다. status는 실패 건수로부터 결정한다 — 실패 0건은 `done`, 성공이 하나도
 * 없으면 `failed`, 나머지(성공·실패 혼재)는 `partial-failed`다(docs/PRD.md §CrawlRun).
 * `aborted`는 이 함수가 아니라 사용자 중단 경로(Task 014B)가 updateRunMeta로 직접 설정한다.
 *
 * `skippedCount`(중단으로 요청조차 하지 않은 건수, I-017)는 **status 계산에 넣지 않는다** —
 * 건너뛴 건이 있다는 이유로 실행이 `partial-failed`가 되면 안 된다. 기록만 한다.
 */
export async function finishRun(
  runId: string,
  counts: { successCount: number; failCount: number; skippedCount?: number }
): Promise<CrawlRun> {
  const status: CrawlRunStatus =
    counts.failCount === 0 ? 'done' : counts.successCount === 0 ? 'failed' : 'partial-failed'

  return updateRunMeta(runId, {
    successCount: counts.successCount,
    failCount: counts.failCount,
    skippedCount: counts.skippedCount ?? 0,
    finishedAt: new Date().toISOString(),
    status,
  })
}
