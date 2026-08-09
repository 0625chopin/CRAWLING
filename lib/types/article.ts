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
