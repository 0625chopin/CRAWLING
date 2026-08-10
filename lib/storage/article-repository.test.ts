import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Article } from '@/lib/types/article'

import { serializeArticle } from './article-file'

let tempDir = ''

// article-repository.ts는 lib/storage/paths.ts의 articlesDir·articlePath로 파일 위치를 정한다.
// press-repository.test.ts·stopword-repository.test.ts와 같은 이유로 실제 data/runs/ 대신
// 테스트별 임시 디렉터리를 가리키게 한다(실제 프로젝트 데이터를 건드리지 않기 위함).
vi.mock('./paths', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./paths')>()
  return {
    ...actual,
    articlesDir: (runId: string) => path.join(tempDir, runId, 'articles'),
    articlePath: (runId: string, articleId: string) =>
      path.join(tempDir, runId, 'articles', `${articleId}.txt`),
  }
})

const { listArticles, readArticle, ArticleNotFoundError } = await import('./article-repository')
const { articlesDir, articlePath } = await import('./paths')

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'article-repo-perf-'))
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

const RUN_ID = '20260101-000000'

function buildArticle(index: number, contentLength: number): Article {
  const id = String(index).padStart(4, '0')
  // 실제 기사 본문처럼 문단(빈 줄 구분) 여러 개로 채운다 — article-parser.ts가 보존하는
  // 개행 구조와 같은 모양이어야 파싱 경로(parseArticleMeta)가 실제 사용 조건과 같아진다.
  const paragraph = `${id}번째 픽스처 기사 본문입니다. `.repeat(20)
  const paragraphCount = Math.max(1, Math.ceil(contentLength / paragraph.length))
  const content = Array.from({ length: paragraphCount }, () => paragraph).join('\n\n')

  return {
    id,
    runId: RUN_ID,
    pressId: 'etnews',
    title: `픽스처 기사 제목 ${id}`,
    url: `https://example.com/article/${id}`,
    content,
    contentSource: index % 2 === 0 ? 'article-page' : 'rss-summary',
    crawledAt: '2026-08-10T14:33:10+09:00',
  }
}

async function writeFixtures(count: number, contentLength: number): Promise<void> {
  await fs.mkdir(articlesDir(RUN_ID), { recursive: true })
  await Promise.all(
    Array.from({ length: count }, (_, i) => {
      const article = buildArticle(i + 1, contentLength)
      return fs.writeFile(articlePath(RUN_ID, article.id), serializeArticle(article), 'utf-8')
    })
  )
}

/**
 * DoD("기사 200건에서도 1초 내 응답")를 재는 하네스. 절대 1000ms를 그대로 assert하지 않는다 —
 * 이 값은 라우트 핸들러까지 포함한 응답 시간(HTTP 오버헤드·JSON 직렬화 포함) 기준이고, 여기서
 * 재는 건 listArticles 함수 단독 실행 시간이라 원래도 더 짧아야 정상이다. 그럼에도 CI 머신
 * 성능 편차로 흔들리는 절대 시간 단정은 피하려고, DoD 기준(1000ms)의 3배인 3000ms를 "명백한
 * 회귀"로만 잡는 여유 있는 상한으로 쓴다. 실제 로컬 측정치는 테스트 실행 로그의 console.info로
 * 남긴다(회차 보고에 실측 수치를 적기 위함).
 */
const REGRESSION_CEILING_MS = 3000

describe('article-repository — listArticles 200건 성능', () => {
  it('본문 길이가 일반적인 기사 200건에서 여유 있게 완료된다', async () => {
    await writeFixtures(200, 800) // 실제 기사 본문 규모(수백~천 자대)를 흉내낸다

    const startedAt = performance.now()
    const items = await listArticles(RUN_ID)
    const elapsedMs = performance.now() - startedAt

    console.info(`[perf] listArticles(200건, 본문 ~800자) = ${elapsedMs.toFixed(1)}ms`)

    expect(items).toHaveLength(200)
    expect(elapsedMs).toBeLessThan(REGRESSION_CEILING_MS)
  })

  it('본문이 훨씬 커도(기사당 ~100KB) 조회 시간이 크게 늘지 않는다 — 본문을 읽지 않는다는 회귀 신호', async () => {
    // listArticles가 실수로 parseArticleMeta 대신 parseArticle(본문 전체 파싱)을 쓰게 되면
    // 200 × 100KB ≈ 20MB를 전부 읽고 디코딩해야 한다. 헤더만 읽는 지금 구현과 시간 차이가
    // 뚜렷해야 정상이므로, 같은 여유 상한 안에서 끝나는지를 신호로 삼는다(엄격한 하한 비교는
    // 하지 않는다 — 두 번 실행해 서로 비교하면 파일시스템 캐시 영향으로 오히려 흔들린다).
    await writeFixtures(200, 100_000)

    const startedAt = performance.now()
    const items = await listArticles(RUN_ID)
    const elapsedMs = performance.now() - startedAt

    console.info(`[perf] listArticles(200건, 본문 ~100KB) = ${elapsedMs.toFixed(1)}ms`)

    expect(items).toHaveLength(200)
    expect(elapsedMs).toBeLessThan(REGRESSION_CEILING_MS)
    // 반환 항목에 content가 애초에 없다(ArticleListItem = ArticleMeta, content 필드 omit) —
    // 타입 레벨 보장이지만 값으로도 한 번 더 확인한다.
    expect(items[0]).not.toHaveProperty('content')
  })

  it('목록은 id(4자리 순번) 오름차순으로 정렬된다', async () => {
    await writeFixtures(30, 500)

    const items = await listArticles(RUN_ID)

    expect(items.map((item) => item.id)).toEqual(
      [...items.map((item) => item.id)].sort((a, b) => a.localeCompare(b))
    )
    expect(items[0].id).toBe('0001')
    expect(items[29].id).toBe('0030')
  })
})

describe('listArticles — 손상된 기사 격리와 로그(I-006)', () => {
  it('메타 라인이 깨진 기사 파일은 건너뛰고 나머지 목록은 정상 반환하며 경고를 남긴다', async () => {
    await writeFixtures(2, 500) // 0001, 0002 정상 기사

    const brokenId = '0099'
    await fs.mkdir(articlesDir(RUN_ID), { recursive: true })
    await fs.writeFile(
      articlePath(RUN_ID, brokenId),
      '# id: 0099\n형식이 아닌 줄\n\n본문',
      'utf-8'
    )

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const items = await listArticles(RUN_ID)

    expect(items.map((item) => item.id)).toEqual(['0001', '0002'])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const [message, error] = warnSpy.mock.calls[0]
    expect(message).toContain('[article-repository]')
    expect(message).toContain(`${RUN_ID}/${brokenId}`)
    expect(error).toBeInstanceOf(Error)

    warnSpy.mockRestore()
  })

  it('손상된 기사가 없으면 경고를 남기지 않는다', async () => {
    await writeFixtures(3, 500)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const items = await listArticles(RUN_ID)

    expect(items).toHaveLength(3)
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

describe('readArticle — 없음/손상 타입 구분(I-020)', () => {
  it('존재하지 않는 기사는 ArticleNotFoundError를 던진다', async () => {
    await fs.mkdir(articlesDir(RUN_ID), { recursive: true })

    await expect(readArticle(RUN_ID, '9999')).rejects.toThrow(ArticleNotFoundError)
  })

  it('메타 라인이 깨진(손상된) 기사는 ArticleNotFoundError가 아닌 별개의 오류를 던진다', async () => {
    const brokenId = '0050'
    await fs.mkdir(articlesDir(RUN_ID), { recursive: true })
    await fs.writeFile(
      articlePath(RUN_ID, brokenId),
      '# id: 0050\n형식이 아닌 줄\n\n본문',
      'utf-8'
    )

    await expect(readArticle(RUN_ID, brokenId)).rejects.toThrow()

    try {
      await readArticle(RUN_ID, brokenId)
      expect.unreachable('예외가 던져져야 한다')
    } catch (error) {
      // "없음"과 "손상"이 라우트에서 instanceof로 갈리려면 서로 다른 타입이어야 한다 —
      // 여기서 둘 다 ArticleNotFoundError면 회귀다.
      expect(error).not.toBeInstanceOf(ArticleNotFoundError)
    }
  })
})
