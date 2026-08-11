import { z } from 'zod'

import { pressCategorySchema } from './press'

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
  /**
   * 기사 발행 시각(RSS `pubDate`/`dc:date`/Atom `updated`를 `lib/crawler/rss.ts`가 파싱한 값).
   * 시간대별 집계(`lib/keyword/daily-keywords.ts`)가 기사를 구간에 배치하는 유일한 기준이다.
   *
   * **`crawledAt`으로 대신하지 않는다.** 한 실행의 기사는 크롤 시각이 전부 같아서 그 값으로
   * 구간을 나누면 "실행 하나 = 구간 하나"가 되어 시간대 비교가 성립하지 않는다. 실측으로도
   * 10:26에 돈 실행 한 건 안에 07~10시 발행 기사가 섞여 있다.
   *
   * **기본값을 두지 않는다** — `category`와 같은 이유다. 값이 없는 것("발행 시각 미상")과 특정
   * 시각인 것은 다른 사실이고, 미상을 임의의 구간으로 접으면 그 구간이 오염된다. HTML 목록
   * 수집 경로는 발행 시각을 알 수 없어 항상 값이 없고, 이 필드가 생기기 전에 수집된 기사도
   * 마찬가지다 — 소비자는 `undefined`를 "시간대 분석 대상 아님"으로 다루고 그 건수를 화면에
   * 밝힌다(`resolveTimeSlotIndex`).
   */
  publishedAt: z.iso.datetime({ offset: true }).optional(),
  /**
   * 크롤 시점 언론사 카테고리 스냅샷(Task 026). 필드는 저장소 계층이 마련하고, 실제 값은 크롤
   * 파이프라인(Task 027)이 크롤 당시 `Press.category`를 옮겨 적어 채운다 — Press의 카테고리가
   * 나중에 바뀌어도 이미 수집된 기사가 속했던 카테고리는 그대로 남아야 하기 때문이다(D-026이
   * 언론사 이름을 스냅샷하지 않기로 한 것과는 반대 결정이다 — 이름은 "지금"을 보여줘도 되지만
   * 카테고리는 필터링에 쓰이므로 "그때"가 맞다).
   *
   * **기본값을 두지 않는다.** 값이 없는 것과 `'it-ai'`인 것은 다른 뜻이다 — "아직 스냅샷되지
   * 않음(카테고리 미상)"과 "실제로 IT/AI"를 같은 값으로 뭉개면 안 된다. 지금 저장된 기사는
   * 전부 이 필드가 없으므로(Task 027 이전), 소비자는 `undefined`를 "카테고리 미상"으로 다루고
   * 필터에서 제외하지 않는다(`lib/api/article-category-filter.ts`).
   */
  category: pressCategorySchema.optional(),
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
