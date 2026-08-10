import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PressRunResult } from '@/lib/types/crawl-run'

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

const { listRuns, getRun, finishRun, RunNotFoundError } = await import('./run-repository')
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
    // toThrow(SomeClass)는 그 클래스가 사라지면 인자 없는 toThrow()와 동치로 조용히 완화된다
    // (I-046). toBeInstanceOf는 undefined가 되면 TypeError로 즉시 실패하므로 안전한 방향이다.
    await expect(getRun('20269999-000000')).rejects.toBeInstanceOf(RunNotFoundError)
  })
})

describe('getRun — pressResults 없는 과거 run-meta.json 호환(I-022)', () => {
  it('pressResults 키 자체가 없는 파일도 빈 배열로 기본값 처리되어 파싱된다', async () => {
    // validRunMetaJson은 이 필드가 생기기 전의 실제 run-meta.json 모양을 그대로 흉내 낸다 —
    // 여기에 pressResults를 추가하면 이 테스트의 목적(과거 파일 호환)이 사라진다.
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    const run = await getRun(VALID_RUN_ID)

    expect(run.pressResults).toEqual([])
  })

  /**
   * `failedPressCount`(I-040)도 같은 함정을 공유한다 — 필수로 두면 이 필드가 생기기 전에 만들어진
   * 파일이 스키마에서 떨어지고, `listRuns`가 그 예외를 삼켜 **해당 run이 목록에서 통째로 사라진다.**
   */
  it('failedPressCount 키가 없는 파일도 0으로 기본값 처리되어 파싱된다(I-040)', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    const run = await getRun(VALID_RUN_ID)

    expect(run.failedPressCount).toBe(0)
    // 목록에서 사라지지 않는 것까지 확인한다 — 이 함정의 실제 증상이 그것이다.
    await expect(listRuns()).resolves.toHaveLength(1)
  })
})

describe('finishRun — pressResults를 run-meta.json에 남긴다(I-022)', () => {
  it('finishRun에 넘긴 pressResults가 반환값과 디스크에 그대로 반영된다', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    const pressResults: PressRunResult[] = [
      { pressId: 'etnews', name: '전자신문', status: 'done', collected: 5, target: 5 },
      {
        pressId: 'techweekly',
        name: '테크위클리',
        status: 'failed',
        collected: 0,
        target: 0,
        failReason: '타임아웃',
        rawFailReason: 'page.goto: Timeout 30000ms exceeded.',
      },
    ]

    const finished = await finishRun(
      VALID_RUN_ID,
      { successCount: 5, failCount: 1, skippedCount: 0, failedPressCount: 1 },
      pressResults
    )

    expect(finished.pressResults).toEqual(pressResults)

    // 반환값을 신뢰하는 대신 다시 읽어, 실제로 디스크에 쓰였는지 확인한다.
    const persisted = await getRun(VALID_RUN_ID)
    expect(persisted.pressResults).toEqual(pressResults)
  })
})

describe('finishRun — 언론사 단위 실패 수를 기사 단위와 나눠 남긴다(I-040)', () => {
  it('failedPressCount를 그대로 저장하고, status는 여전히 기사 단위 failCount로 정한다', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    // I-040의 핵심 상황: 언론사는 한 곳도 통째로 실패하지 않았는데(0) 개별 기사만 2건 실패했다.
    const finished = await finishRun(
      VALID_RUN_ID,
      { successCount: 5, failCount: 2, skippedCount: 0, failedPressCount: 0 },
      [{ pressId: 'etnews', name: '전자신문', status: 'done', collected: 5, target: 7 }]
    )

    expect(finished.failedPressCount).toBe(0)
    // 기사 1건이라도 실패했으면 그 실행은 실제로 "일부 실패"다 — 이 판정 기준은 바뀌지 않았다.
    expect(finished.status).toBe('partial-failed')
    expect((await getRun(VALID_RUN_ID)).failedPressCount).toBe(0)
  })

  it('넘기지 않으면 0으로 기록한다(과거 호출부 호환)', async () => {
    await writeRunMeta(VALID_RUN_ID, validRunMetaJson(VALID_RUN_ID))

    const finished = await finishRun(VALID_RUN_ID, { successCount: 1, failCount: 0 }, [])

    expect(finished.failedPressCount).toBe(0)
  })
})
