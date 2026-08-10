import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pressCreateSchema } from '@/lib/types/press'

import {
  createPress,
  deletePress,
  getPress,
  listPress,
  updatePress,
} from './press-repository'

let pressSourcesFile = ''

// 실제 data/press-sources.json 대신 테스트별 임시 파일을 가리키게 한다(stopword-repository.test.ts와
// 동일한 이유 — 실제 프로젝트 데이터를 읽고 덮어쓰지 않기 위함).
vi.mock('./paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./paths')>()
  return { ...actual, pressSourcesPath: () => pressSourcesFile }
})

let tempDir: string

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'press-repo-'))
  pressSourcesFile = path.join(tempDir, 'press-sources.json')
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

const rssInput = {
  name: 'ZDNet Korea',
  isActive: true,
  sourceType: 'rss' as const,
  feedUrl: 'https://zdnet.co.kr/news/news_xml.asp',
}

const htmlInput = {
  name: 'IT조선',
  isActive: true,
  sourceType: 'html' as const,
  listUrl: 'https://it.chosun.com/news/it',
  articleLinkSelector: '.article-list a.tit',
  titleSelector: 'h1.article-title',
  contentSelector: '#article-view-content-div',
}

describe('press-repository — 초기 상태', () => {
  it('파일이 없으면 빈 목록을 돌려준다', async () => {
    expect(await listPress()).toEqual([])
  })

  it('존재하지 않는 id를 조회하면 null을 돌려준다', async () => {
    expect(await getPress('no-such-press')).toBeNull()
  })

  // stopword-repository.test.ts의 "시드가 실제로 파일에 기록된다"와 대칭을 맞춘다 — 두 저장소가
  // 같은 readJson 폴백 경로를 타지만 DoD 1번이 두 파일 모두를 요구한다(3일차 교차검증 지적).
  it('첫 조회에서 빈 배열 시드가 실제로 파일에 기록된다', async () => {
    await listPress()

    const raw = await fs.readFile(pressSourcesFile, 'utf-8')
    expect(JSON.parse(raw)).toEqual([])
  })
})

// 화면에서는 "id가 다른 값인지"를 눈으로 확인하기 어렵다(둘 다 이름이 같게 보인다).
// docs/ROADMAP.md Task 006 DoD: "같은 이름으로 언론사를 2번 추가하면 서로 다른 id가 부여된다."
describe('press-repository — id 슬러그 부여', () => {
  it('같은 이름을 두 번 등록하면 접미 숫자로 구분되는 id가 부여된다', async () => {
    const first = await createPress(rssInput)
    const second = await createPress(rssInput)

    expect(first.id).toBe('zdnet-korea')
    expect(second.id).toBe('zdnet-korea-2')
    expect(first.id).not.toBe(second.id)
  })

  it('ASCII 영숫자가 없는 한글 전용 이름은 press 접두사로 대체하고 접미 숫자로 구분한다(폴백 유지)', async () => {
    const first = await createPress({ ...htmlInput, name: '전자신문' })
    const second = await createPress({ ...htmlInput, name: '디지털투데이' })

    expect(first.id).toBe('press')
    expect(second.id).toBe('press-2')
  })
})

// 3일차 교차검증 결정(3안): id를 선택 필드로 열어 실제 영문 브랜드명을 직접 지정할 수 있게 한다
// (docs/ISSUES.draft.저장소계층.md). "블로터" → "bloter"처럼 로마자 표기로는 만들 수 없는 값이 목적이다.
describe('press-repository — 명시 id 지정', () => {
  it('명시한 id를 그대로 쓴다', async () => {
    const created = await createPress({
      ...htmlInput,
      name: '전자신문',
      id: 'etnews',
    })
    expect(created.id).toBe('etnews')
  })

  it('명시한 id가 이미 쓰이고 있으면 접미 숫자를 붙인다', async () => {
    const first = await createPress({
      ...rssInput,
      name: '블로터',
      id: 'bloter',
    })
    const second = await createPress({
      ...rssInput,
      name: '블로터 IT',
      id: 'bloter',
    })

    expect(first.id).toBe('bloter')
    expect(second.id).toBe('bloter-2')
  })

  it('id는 여전히 불변이다 — patch에 다른 id가 실려도 무시된다', async () => {
    // PressUpdateInput === PressCreateInput이라 patch에도 optional id가 타입상 허용된다.
    // updatePress는 함수 인자로 받은 id(대상 레코드)만 쓰고 patch.id는 무시해야 한다.
    const created = await createPress({ ...rssInput, id: 'etnews' })

    const updated = await updatePress(created.id, {
      ...htmlInput,
      id: 'someone-else',
    })

    expect(updated.id).toBe('etnews')
  })

  it('슬러그 형식(소문자·영숫자·하이픈)을 어기면 필드별 한국어 메시지로 거부한다', () => {
    const result = pressCreateSchema.safeParse({ ...rssInput, id: 'ETNEWS_1' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const idIssue = result.error.issues.find(
        (issue) => issue.path[0] === 'id'
      )
      expect(idIssue?.message).toBe(
        'id는 소문자·숫자·하이픈만 사용할 수 있습니다'
      )
    }
  })

  it('id를 생략하면 지금까지의 slugify 폴백을 그대로 탄다', async () => {
    const created = await createPress(rssInput)
    expect(created.id).toBe('zdnet-korea')
  })
})

describe('press-repository — sourceType 전환', () => {
  it('html에서 rss로 수정하면 저장된 JSON에 html 전용 필드가 남지 않는다', async () => {
    const created = await createPress(htmlInput)

    await updatePress(created.id, {
      name: created.name,
      isActive: true,
      sourceType: 'rss',
      feedUrl: 'https://example.com/rss.xml',
    })

    const raw = await fs.readFile(pressSourcesFile, 'utf-8')
    const persisted = JSON.parse(raw)
    const record = persisted.find(
      (item: { id: string }) => item.id === created.id
    )

    expect(record.sourceType).toBe('rss')
    expect(record.feedUrl).toBe('https://example.com/rss.xml')
    expect(record).not.toHaveProperty('listUrl')
    expect(record).not.toHaveProperty('articleLinkSelector')
    expect(record).not.toHaveProperty('titleSelector')
  })

  it('id는 sourceType이 바뀌어도 그대로 유지된다', async () => {
    const created = await createPress(rssInput)

    const updated = await updatePress(created.id, { ...htmlInput })

    expect(updated.id).toBe(created.id)
    expect(updated.sourceType).toBe('html')
  })

  it('isActive만 바꾸는 부분 patch는 sourceType 전용 필드를 그대로 유지한다', async () => {
    const created = await createPress(htmlInput)

    const updated = await updatePress(created.id, { isActive: false })

    expect(updated.isActive).toBe(false)
    expect(updated.sourceType).toBe('html')
    if (updated.sourceType === 'html') {
      expect(updated.articleLinkSelector).toBe(htmlInput.articleLinkSelector)
      expect(updated.titleSelector).toBe(htmlInput.titleSelector)
      expect(updated.contentSelector).toBe(htmlInput.contentSelector)
    }
  })

  it('존재하지 않는 id를 수정하면 예외를 던진다', async () => {
    await expect(
      updatePress('no-such-press', { isActive: true })
    ).rejects.toThrow()
  })
})

describe('press-repository — 목록 조회', () => {
  it('activeOnly는 isActive: true인 언론사만 돌려준다', async () => {
    const active = await createPress({ ...rssInput, name: '가나다언론' })
    await createPress({ ...htmlInput, name: '마바사언론', isActive: false })

    const activeList = await listPress({ activeOnly: true })
    expect(activeList.map((press) => press.id)).toEqual([active.id])
  })

  it('방식이 섞여 있어도 이름 하나로만 정렬한다', async () => {
    await createPress({ ...htmlInput, name: '나언론' })
    await createPress({ ...rssInput, name: '가언론' })
    await createPress({ ...htmlInput, name: '다언론' })

    const list = await listPress()
    expect(list.map((press) => press.name)).toEqual([
      '가언론',
      '나언론',
      '다언론',
    ])
  })
})

describe('press-repository — 삭제', () => {
  it('레지스트리에서만 제거하고 재조회에서 사라진다', async () => {
    const created = await createPress(rssInput)
    await deletePress(created.id)

    expect(await listPress()).toEqual([])
    expect(await getPress(created.id)).toBeNull()
  })

  it('존재하지 않는 id를 삭제해도 예외를 던지지 않는다', async () => {
    await expect(deletePress('no-such-press')).resolves.toBeUndefined()
  })
})
