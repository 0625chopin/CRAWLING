import 'server-only'

import { articleSchema, articleMetaSchema, type Article, type ArticleMeta } from '@/lib/types/article'

/**
 * 메타 라인 하나의 형태 — "# key: value". key는 카멜케이스 영문자만 쓰므로 letters-only로 충분하다.
 * value는 줄 끝까지 그대로 캡처한다 — 제목에 콜론(:)이나 #이 섞여 있어도 첫 ": " 구분자 뒤는
 * 전부 값으로 취급되므로 별도 이스케이프가 필요 없다.
 */
const META_LINE_PATTERN = /^# ([a-zA-Z]+): (.*)$/

/**
 * 메타 라인에 개행이 섞이면 다음 physical line이 새 메타 필드로 오인되어 파싱이 깨진다
 * (ROADMAP Task 007 구현 규칙 "제목·URL은 저장 전에 개행 제거"). 개행을 공백 하나로 접어
 * 메타 라인이 항상 한 줄을 보장하게 한다.
 */
function sanitizeMetaValue(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ').trim()
}

/**
 * 기사 txt 직렬화. 포맷은 상단 메타 라인(기본 7줄) + 빈 줄 + 본문이다(ROADMAP Task 007이 확정한
 * 포맷). 본문은 그대로 옮겨 적는다 — article-parser.ts(Task 013A)가 보존한 문단 개행(`\n\n`)을
 * 여기서 다시 접으면 화면 미리보기(docs/screens/02-collect-result.md ⑤ "본문 개행 보존 전제")가
 * 깨진다.
 *
 * `category`(Task 027)는 **있을 때만** 마지막 줄로 얹는다 — 항상 쓰면 카테고리 줄이 없는 과거
 * 기사 txt와 지금 만드는 파일의 모양이 달라져 "없으면 undefined로 흘린다"는 하위호환 전제가
 * 애초에 검증되지 않는다. 없는 경우(카테고리 미상)는 그냥 줄 자체를 만들지 않는다.
 */
export function serializeArticle(article: Article): string {
  const metaLines = [
    `# id: ${article.id}`,
    `# runId: ${article.runId}`,
    `# pressId: ${article.pressId}`,
    `# title: ${sanitizeMetaValue(article.title)}`,
    `# url: ${sanitizeMetaValue(article.url)}`,
    `# contentSource: ${article.contentSource}`,
    `# crawledAt: ${article.crawledAt}`,
  ]
  if (article.category !== undefined) {
    metaLines.push(`# category: ${article.category}`)
  }

  return `${metaLines.join('\n')}\n\n${article.content}`
}

/**
 * 메타 라인 블록(첫 빈 줄 앞부분)만 파싱한다. article-repository.ts의 listArticles가 본문을
 * 읽지 않고 목록을 만들 때 이 함수만 재사용해 부분 읽기 결과를 넘긴다(ROADMAP Task 007 DoD).
 */
export function parseArticleMeta(headerBlock: string): ArticleMeta {
  const fields: Record<string, string> = {}

  for (const line of headerBlock.split('\n')) {
    const match = META_LINE_PATTERN.exec(line)
    if (!match) {
      throw new Error(`기사 메타 라인 형식이 올바르지 않습니다: "${line}"`)
    }
    fields[match[1]] = match[2]
  }

  const result = articleMetaSchema.safeParse(fields)
  if (!result.success) {
    throw new Error('기사 메타 라인 내용이 예상한 형식과 다릅니다')
  }
  return result.data
}

/**
 * 기사 txt 역직렬화. `{ runId, articleId }`는 파일 경로(폴더명·파일명)에서 이미 알고 있는 값이다 —
 * 메타 라인 내용과 어긋나면(파일이 잘못 옮겨졌거나 손상된 경우) 조용히 넘기지 않고 예외를 던진다
 * (docs/CONVENTIONS.md §7 "파일 파싱 실패는 조용히 덮어쓰지 않는다").
 */
export function parseArticle(
  text: string,
  context: { runId: string; articleId: string }
): Article {
  const separatorIndex = text.indexOf('\n\n')
  if (separatorIndex === -1) {
    throw new Error(
      `기사 파일에서 메타 구분줄을 찾을 수 없습니다: ${context.runId}/${context.articleId}`
    )
  }

  const meta = parseArticleMeta(text.slice(0, separatorIndex))
  const content = text.slice(separatorIndex + 2)

  if (meta.id !== context.articleId || meta.runId !== context.runId) {
    throw new Error(
      `기사 파일 메타가 예상과 다릅니다(예상 ${context.runId}/${context.articleId}, ` +
        `실제 ${meta.runId}/${meta.id})`
    )
  }

  return articleSchema.parse({ ...meta, content })
}
