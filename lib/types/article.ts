import { z } from 'zod'

/**
 * 본문 출처. RSS 요약과 원문 전문이 한 실행에 섞이면 전문을 수집한 언론사의 단어가
 * 빈도 상위를 차지하는 편향이 생긴다 — 나중에 이를 확인하려면 기사별로 남아 있어야 한다(docs/PRD.md §Article).
 */
export const contentSourceSchema = z.enum(['rss-summary', 'article-page'])
export type ContentSource = z.infer<typeof contentSourceSchema>

/** 4자리 제로패딩 순번(docs/CONVENTIONS.md §식별자 규칙). 파일명이 그대로 정렬 순서가 된다. */
const articleIdSchema = z.string().regex(/^\d{4}$/, 'article id는 4자리 숫자여야 합니다')

export const articleSchema = z.object({
  id: articleIdSchema,
  pressId: z.string().min(1),
  runId: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  content: z.string(),
  contentSource: contentSourceSchema,
  crawledAt: z.iso.datetime({ offset: true }),
})
export type Article = z.infer<typeof articleSchema>

/**
 * articleSchema에서 content만 뺀 도메인 뷰 타입 — listArticles가 본문을 읽지 않고 메타 라인만으로
 * 목록을 구성하므로(ROADMAP Task 007 DoD), 목록 조회 응답의 항목 형태가 곧 이 뷰다. 저장소 계층의
 * 파일 파싱(lib/storage/article-file.ts)이 이 스키마로 검증하지만, 화면이 쓰는 파생 뷰라는 성격은
 * lib/types/keyword.ts의 keywordRankItemSchema와 같다(I-007).
 */
export const articleMetaSchema = articleSchema.omit({ content: true })
export type ArticleMeta = z.infer<typeof articleMetaSchema>

/** listArticles의 반환 항목 별칭 — 위 메타 타입과 같은 모양이다. */
export type ArticleListItem = ArticleMeta
