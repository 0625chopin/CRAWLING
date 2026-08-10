import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { cleanupOrphanTempFiles } from './temp-cleanup'

let tempDir = ''

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-cleanup-'))
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

/** `atomicWriteFile`이 실제로 만드는 이름 형태 그대로다 — `<원본경로>.<uuid v4>.tmp`. */
function orphanName(base: string): string {
  return `${base}.3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.tmp`
}

async function write(relativePath: string): Promise<string> {
  const filePath = path.join(tempDir, relativePath)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, 'x', 'utf-8')
  return filePath
}

async function exists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false)
}

describe('cleanupOrphanTempFiles (I-002)', () => {
  it('중첩된 하위 디렉터리의 orphan 임시 파일까지 지운다', async () => {
    const top = await write(orphanName('press-sources.json'))
    const nested = await write(path.join('runs', '20260101-000000', orphanName('run-meta.json')))
    const deep = await write(
      path.join('runs', '20260101-000000', 'articles', orphanName('0001.txt'))
    )

    const removed = await cleanupOrphanTempFiles(tempDir)

    expect(removed).toHaveLength(3)
    expect(await exists(top)).toBe(false)
    expect(await exists(nested)).toBe(false)
    expect(await exists(deep)).toBe(false)
  })

  it('정상 파일은 건드리지 않는다', async () => {
    const json = await write('press-sources.json')
    const article = await write(path.join('runs', '20260101-000000', 'articles', '0001.txt'))

    await cleanupOrphanTempFiles(tempDir)

    expect(await exists(json)).toBe(true)
    expect(await exists(article)).toBe(true)
  })

  /**
   * 이 도구가 부팅할 때마다 사용자의 `data/`를 훑는다는 점이 핵심이다. `*.tmp`를 전부 지우면
   * 손으로 놓아둔 파일이 말없이 사라진다 — uuid 형태까지 맞는 것만 "우리가 만들었다"고 단정한다.
   */
  it.each([
    ['메모.tmp'],
    ['run-meta.json.tmp'],
    ['run-meta.json.not-a-uuid.tmp'],
    ['run-meta.json.3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.txt'],
  ])('우리가 만들지 않은 %s는 남긴다', async (name) => {
    const kept = await write(name)

    const removed = await cleanupOrphanTempFiles(tempDir)

    expect(removed).toEqual([])
    expect(await exists(kept)).toBe(true)
  })

  it('디렉터리가 아예 없어도 던지지 않는다(첫 실행)', async () => {
    await expect(cleanupOrphanTempFiles(path.join(tempDir, 'not-created-yet'))).resolves.toEqual([])
  })
})
