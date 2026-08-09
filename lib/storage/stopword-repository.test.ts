import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addStopword,
  addStopwords,
  deleteStopword,
  getStopwordSet,
  listStopwords,
} from './stopword-repository'

let stopwordsFile = ''

// 실제 data/stopwords.json 대신 테스트별 임시 파일을 가리키게 한다 — 그렇지 않으면 이 테스트가
// 개발 중인 프로젝트의 실제 데이터 파일을 읽고 덮어쓰게 된다. vi.mock은 파일 상단으로
// 호이스팅되므로 import 다음 줄에 있어도 문제없이 적용된다.
vi.mock('./paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./paths')>()
  return { ...actual, stopwordsPath: () => stopwordsFile }
})

let tempDir: string

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stopword-repo-'))
  stopwordsFile = path.join(tempDir, 'stopwords.json')
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

// 화면에서는 "불용어가 7개 보이는지"만 확인할 수 있고, id 형식이나 파일 재생성 여부는
// 눈으로 확인할 수 없다(docs/ROADMAP.md Task 006 DoD).
describe('stopword-repository — 기본 프리셋 시드', () => {
  it('파일이 없으면 첫 조회에서 기본 프리셋 7건(이번 포함)을 생성한다', async () => {
    const stopwords = await listStopwords()

    expect(stopwords).toHaveLength(7)
    expect(stopwords.every((item) => item.isDefault)).toBe(true)
    expect(stopwords.map((item) => item.word)).toEqual([
      '기자',
      '사진',
      '제공',
      '앵커',
      '무단전재',
      '재배포금지',
      '이번',
    ])
    expect(stopwords.map((item) => item.id)).toEqual([
      'sw-0001',
      'sw-0002',
      'sw-0003',
      'sw-0004',
      'sw-0005',
      'sw-0006',
      'sw-0007',
    ])
  })

  it('시드가 실제로 파일에 기록된다', async () => {
    await listStopwords()

    const raw = await fs.readFile(stopwordsFile, 'utf-8')
    const persisted = JSON.parse(raw)
    expect(persisted).toHaveLength(7)
  })
})

describe('stopword-repository — 중복 검사', () => {
  it('이미 등록된 단어를 다시 추가하면 파일이 변하지 않고 duplicate로 알린다', async () => {
    await listStopwords() // 기본 프리셋 시드

    const result = await addStopword('기자')

    expect(result).toEqual({ status: 'duplicate', word: '기자' })
    const stopwords = await listStopwords()
    expect(stopwords).toHaveLength(7)
  })

  it('대소문자·앞뒤 공백만 다른 입력도 중복으로 판정한다', async () => {
    const added = await addStopword('AI')
    expect(added.status).toBe('added')

    const duplicate = await addStopword('  ai  ')
    expect(duplicate).toEqual({ status: 'duplicate', word: 'ai' })

    const stopwords = await listStopwords()
    expect(
      stopwords.filter((item) => item.word.toLowerCase() === 'ai')
    ).toHaveLength(1)
  })

  it('새로 추가한 단어는 isDefault: false로 저장된다', async () => {
    const result = await addStopword('삼성전자')
    expect(result).toEqual({
      status: 'added',
      stopword: { id: expect.any(String), word: '삼성전자', isDefault: false },
    })
  })
})

describe('stopword-repository — 일괄 추가', () => {
  it('이미 등록된 단어와 배치 내부 중복을 모두 걸러낸다', async () => {
    await listStopwords() // '앵커'가 기본 프리셋에 이미 있는 상태로 시작

    const result = await addStopwords(['특파원', '인턴기자', '특파원', '앵커'])

    expect(result.added.map((item) => item.word)).toEqual([
      '특파원',
      '인턴기자',
    ])
    expect(result.skipped).toEqual(['특파원', '앵커'])
  })

  it('빈 문자열은 추가·건너뜀 어느 쪽에도 남기지 않는다', async () => {
    const result = await addStopwords(['테스트', '  ', ''])
    expect(result.added.map((item) => item.word)).toEqual(['테스트'])
    expect(result.skipped).toEqual([])
  })
})

describe('stopword-repository — 삭제', () => {
  it('기본 프리셋을 삭제하면 재조회해도 되살아나지 않는다', async () => {
    await listStopwords() // 시드
    await deleteStopword('sw-0001') // '기자'

    const stopwords = await listStopwords()
    expect(stopwords).toHaveLength(6)
    expect(stopwords.some((item) => item.id === 'sw-0001')).toBe(false)
    expect(stopwords.some((item) => item.word === '기자')).toBe(false)
  })
})

describe('stopword-repository — getStopwordSet', () => {
  it('Set<string>을 돌려주고 추가한 단어를 포함한다', async () => {
    await listStopwords()
    await addStopword('오늘')

    const set = await getStopwordSet()
    expect(set).toBeInstanceOf(Set)
    expect(set.has('오늘')).toBe(true)
    expect(set.has('기자')).toBe(true)
    expect(set.size).toBe(8)
  })
})
