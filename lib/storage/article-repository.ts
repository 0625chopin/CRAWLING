import 'server-only'

import fs from 'node:fs/promises'

import type { Article, ArticleListItem, ArticleMeta } from '@/lib/types/article'

import { parseArticle, parseArticleMeta, serializeArticle } from './article-file'
import { atomicWriteFile } from './json-store'
import { articlePath, articlesDir } from './paths'

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

/**
 * 존재하지 않는 (runId, articleId)를 나타내는 전용 타입(I-020). `readArticle`의 ENOENT 분기가
 * 유일한 발생지다. `run-repository.ts`의 `RunNotFoundError`(D-022)와 같은 형태로 만들었다 —
 * 그쪽도 원래는 문자열 메시지로만 "없음"을 나타냈다가, 소비자가 `error.message.startsWith(...)`로
 * 판정해야 했던 것이 문제였다. 이전에는 `readArticle`이 "없음"과 "메타 라인 손상"을 똑같은
 * 평범한 `Error`로 던져 `app/api/runs/[runId]/articles/[articleId]/route.ts`가 `instanceof`로
 * 가를 수 없었고(I-020), 그 라우트는 이 타입이 생기기 전까지 `readArticle` 호출 전에
 * `fs.access`로 존재를 먼저 확인하는 우회(D-032)로 버텨야 했다.
 *
 * "손상"(메타 구분줄 없음·메타 라인 형식 불일치·contentSource 누락·컨텍스트 불일치) 쪽에는
 * 전용 타입을 두지 않았다 — `withErrorBoundary`(`lib/api/response.ts`)가 이미 모든 예외를
 * `console.error`로 서버 콘솔에 남기고 500 + 정형화된 한국어 메시지로 응답하므로, 조용히
 * 삼켜지는 경로가 없다(`docs/CONVENTIONS.md` §7 충족). 라우트가 필요로 하는 판정은 "없음(404)
 * vs 그 외 전부(500)" 하나뿐이라, 손상 원인별로 세분화된 타입을 더 만드는 것은 지금 쓰임이
 * 없다 — 두 번째 소비처가 생기면 그때 쪼갠다.
 */
export class ArticleNotFoundError extends Error {
  constructor(
    public readonly runId: string,
    public readonly articleId: string
  ) {
    super(`기사를 찾을 수 없습니다: ${runId}/${articleId}`)
    this.name = 'ArticleNotFoundError'
  }
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
 * (CrawlFailure류 값 격리 원칙, docs/CONVENTIONS.md §7). **다만 값 격리가 침묵이어서는 안 된다**
 * (I-006) — 사용자가 `data/`를 손으로 편집하다 파일을 깨뜨리면 이 목록에서 그 기사가 사라지는데,
 * 로그가 없으면 왜 사라졌는지 알 방법이 없었다. `lib/keyword/analyze-run.ts`가 이미 쓰고 있는
 * `[모듈명] 설명: 대상` 형식(개별 실패를 값으로 격리하면서도 서버 콘솔에는 남기는 선례)을
 * 그대로 따라 `console.warn`으로 남긴다.
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
      const articleId = fileName.slice(0, -'.txt'.length)
      try {
        const header = await readArticleHeaderBlock(articlePath(runId, articleId))
        return parseArticleMeta(header)
      } catch (error) {
        // 헤더 읽기 실패(권한 오류 등)와 메타 라인 파싱 실패를 여기서 더 잘게 가르지 않는다 —
        // 둘 다 "이 기사 1건은 쓸 수 없으니 건너뛴다"는 같은 처리로 이어지고, 원인 구분은
        // 아래 error 객체가 콘솔에 그대로 남으므로 필요하면 로그에서 확인할 수 있다.
        console.warn(`[article-repository] 손상된 기사를 건너뜁니다: ${runId}/${articleId}`, error)
        return null
      }
    })
  )

  return items
    .filter((item): item is ArticleMeta => item !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * 파일 미리보기(화면 설계서 02 ⑤)용 단건 조회. 본문까지 전부 읽는다.
 *
 * "없음"(ENOENT)은 `ArticleNotFoundError`로 던진다(I-020) — 소비자가 `instanceof`로 404를
 * 판정할 수 있다. "손상"(`parseArticle`이 던지는 형식 오류)은 그대로 흘려보낸다 — 조용히
 * 삼키지 않는다는 원칙(docs/CONVENTIONS.md §7)은 지키되, 별도 타입으로 감싸지 않는 이유는
 * `ArticleNotFoundError` 선언부 주석에 남겼다.
 */
export async function readArticle(runId: string, articleId: string): Promise<Article> {
  let raw: string
  try {
    raw = await fs.readFile(articlePath(runId, articleId), 'utf-8')
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ArticleNotFoundError(runId, articleId)
    }
    throw error
  }
  return parseArticle(raw, { runId, articleId })
}
