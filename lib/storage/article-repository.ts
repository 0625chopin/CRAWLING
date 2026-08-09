import 'server-only'

import fs from 'node:fs/promises'

import type { Article, ArticleListItem, ArticleMeta } from '@/lib/types/article'

import { parseArticle, parseArticleMeta, serializeArticle } from './article-file'
import { atomicWriteFile } from './json-store'
import { articlePath, articlesDir } from './paths'

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

const HEADER_READ_INITIAL_BYTES = 4096
/** 제목·URL이 비정상적으로 길어도 감당할 상한. 이 이상 커지면 형식이 깨진 파일로 본다. */
const HEADER_READ_MAX_BYTES = 65536

/**
 * 메타 구분줄(빈 줄)이 나올 때까지만 읽는다. 기사 본문을 매번 통째로 읽으면 기사 수백 건에서
 * 목록 조회가 느려진다(ROADMAP Task 007 DoD "listArticles는 본문을 읽지 않는다").
 * 대부분의 헤더는 4KB 안에 들어오지만, 혹시 넘치면 두 배씩 키워 다시 읽는다.
 */
async function readArticleHeaderBlock(filePath: string): Promise<string> {
  const handle = await fs.open(filePath, 'r')
  try {
    let readSize = HEADER_READ_INITIAL_BYTES
    for (;;) {
      const buffer = Buffer.alloc(readSize)
      const { bytesRead } = await handle.read(buffer, 0, readSize, 0)
      const text = buffer.toString('utf-8', 0, bytesRead)
      const separatorIndex = text.indexOf('\n\n')
      if (separatorIndex !== -1) return text.slice(0, separatorIndex)

      if (bytesRead < readSize) {
        // 파일 전체를 읽었는데도 구분줄이 없다 — 형식이 깨진 파일이다.
        throw new Error(`기사 파일에서 메타 구분줄을 찾을 수 없습니다: ${filePath}`)
      }
      if (readSize >= HEADER_READ_MAX_BYTES) {
        throw new Error(`기사 파일 메타 블록이 비정상적으로 큽니다: ${filePath}`)
      }
      readSize *= 2
    }
  } finally {
    await handle.close()
  }
}

/** article.runId가 저장 대상 runId와 다르면 엉뚱한 실행 폴더에 쓰이는 사고라 조용히 넘기지 않는다. */
export async function saveArticle(runId: string, article: Article): Promise<void> {
  if (article.runId !== runId) {
    throw new Error(
      `기사 runId(${article.runId})가 저장 대상 실행(${runId})과 일치하지 않습니다`
    )
  }
  await atomicWriteFile(articlePath(runId, article.id), serializeArticle(article))
}

/**
 * 본문을 읽지 않고 메타 라인만으로 목록을 구성한다(ROADMAP Task 007 구현 규칙). 화면 설계서 02의
 * 파일 목록·미리보기 트리거가 필요로 하는 필드(파일명·언론사·제목·본문 출처·수집 시각)를 담는다.
 * 손상된 기사 파일 1건이 전체 목록 조회를 막지 않도록 파싱에 실패한 파일은 건너뛴다
 * (CrawlFailure류 값 격리 원칙, docs/CONVENTIONS.md §7).
 */
export async function listArticles(runId: string): Promise<ArticleListItem[]> {
  let fileNames: string[]
  try {
    fileNames = (await fs.readdir(articlesDir(runId))).filter((name) => name.endsWith('.txt'))
  } catch (error) {
    if (isNotFoundError(error)) return [] // 아직 기사가 하나도 저장되지 않은 실행
    throw error
  }

  const items = await Promise.all(
    fileNames.map(async (fileName) => {
      try {
        const articleId = fileName.slice(0, -'.txt'.length)
        const header = await readArticleHeaderBlock(articlePath(runId, articleId))
        return parseArticleMeta(header)
      } catch {
        return null
      }
    })
  )

  return items
    .filter((item): item is ArticleMeta => item !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** 파일 미리보기(화면 설계서 02 ⑤)용 단건 조회. 본문까지 전부 읽는다. */
export async function readArticle(runId: string, articleId: string): Promise<Article> {
  let raw: string
  try {
    raw = await fs.readFile(articlePath(runId, articleId), 'utf-8')
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`기사를 찾을 수 없습니다: ${runId}/${articleId}`)
    }
    throw error
  }
  return parseArticle(raw, { runId, articleId })
}
