import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tempDir = ''

// run-repository.ts는 lib/storage/paths.ts의 runsRootDir·runDir·runMetaPath로 파일 위치를
// 정한다. article-repository.test.ts와 같은 이유로 실제 data/runs/ 대신 테스트별 임시
// 디렉터리를 가리키게 한다(실제 프로젝트 데이터를 건드리지 않기 위함).
vi.mock('./paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./paths')>()
  return {
    ...actual,
    runsRootDir: () => path.join(tempDir, 'runs'),
    runDir: (runId: string) => path.join(tempDir, 'runs', runId),
    runMetaPath: (runId: string) => path.join(tempDir, 'runs', runId, 'run-meta.json'),
    articlesDir: (runId: string) => path.join(tempDir, 'runs', runId, 'articles'),
  }
})

const { listRuns, getRun, RunNotFoundError } = await import('./run-repository')
const { runsRootDir } = await import('./paths')

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-repo-'))
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

const VALID_RUN_ID = '20260101-000000'

async function writeRunMeta(runId: string, content: string): Promise<void> {
  const runDirPath = path.join(runsRootDir(), runId)
  await fs.mkdir(runDirPath, { recursive: true })
  await fs.writeFile(path.join(runDirPath, 'run-meta.json'), content, 'utf-8')
}

function validRunMetaJson(id: string): string {
  return JSON.stringify({
    id,
    targetPressIds: ['etnews'],
    startedAt: '2026-01-01T00:00:00+09:00',
    finishedAt: null,
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
    status: 'running',
  })
}

describe('listRuns — 손상된 실행 격리와 로그(I-006)', () => {
  it('JSON 자체가 깨진 run-meta.json은 건너뛰고 나머지 목록은 정상 반환하며 경고를 남긴다', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))
    const brokenId = '20260102-000000'
    await writeRunMeta(brokenId, '{ 이것은 유효한 JSON이 아님')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const runs = await listRuns()

    expect(runs.map((run) => run.id)).toEqual([VALID_RUN_ID])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const [message, error] = warnSpy.mock.calls[0]
    expect(message).toContain('[run-repository]')
    expect(message).toContain(brokenId)
    expect(error).toBeInstanceOf(Error)

    warnSpy.mockRestore()
  })

  it('JSON은 유효하지만 스키마와 어긋나는 run-meta.json도 건너뛰고 경고를 남긴다', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))
    const brokenId = '20260103-000000'
    // status가 스키마에 없는 값이라 crawlRunSchema.safeParse가 실패한다.
    await writeRunMeta(
      brokenId,
      JSON.stringify({
        id: brokenId,
        targetPressIds: [],
        startedAt: '2026-01-03T00:00:00+09:00',
        finishedAt: null,
        successCount: 0,
        failCount: 0,
        status: '알 수 없는 상태',
      })
    )

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const runs = await listRuns()

    expect(runs.map((run) => run.id)).toEqual([VALID_RUN_ID])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain(brokenId)

    warnSpy.mockRestore()
  })

  it('손상된 실행이 없으면 경고를 남기지 않는다', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const runs = await listRuns()

    expect(runs).toHaveLength(1)
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

describe('getRun — 존재하지 않는 실행(RunNotFoundError, D-022 회귀)', () => {
  it('존재하지 않는 runId는 RunNotFoundError를 던진다', async () => {
    await expect(getRun('20269999-000000')).rejects.toThrow(RunNotFoundError)
  })
})
