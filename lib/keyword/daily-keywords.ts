import 'server-only'

import { matchesCategoryFilter } from '@/lib/api/article-category-filter'
import { listArticles, readArticle } from '@/lib/storage/article-repository'
import {
  CURRENT_DAILY_CACHE_VERSION,
  OTHER_DATE_SLOT,
  readDailyKeywords,
  stopwordSignature,
  UNKNOWN_CATEGORY_KEY,
  UNKNOWN_SLOT,
  writeDailyKeywords,
  type DailyBucket,
  type DailyBucketCategory,
  type DailyKeywordsFile,
} from '@/lib/storage/daily-keyword-repository'
import { listRuns } from '@/lib/storage/run-repository'
import { getStopwordSet } from '@/lib/storage/stopword-repository'
import type { AnalysisSummary, PosTag } from '@/lib/types/keyword'
import type { PressCategory } from '@/lib/types/press'
import { resolveTimeSlotIndex, TIME_SLOTS, toLocalDateKey } from '@/lib/types/time-slot'

import { analyzeArticleContent } from './aggregate'

/** 집계를 쌓는 동안 쓰는 가변 버킷. 저장 형식(`DailyBucket`)과 달리 items를 Map으로 들고 있다. */
interface MutableBucket {
  slot: number
  category: DailyBucketCategory
  articleCount: number
  totalTokenCount: number
  filteredTokenCount: number
  stopwordExcludedCount: number
  counts: Map<string, { posTag: PosTag; count: number }>
}

function bucketKey(slot: number, category: DailyBucketCategory): string {
  return `${slot}|${category}`
}

function toMutableBuckets(buckets: readonly DailyBucket[]): Map<string, MutableBucket> {
  const map = new Map<string, MutableBucket>()
  for (const bucket of buckets) {
    map.set(bucketKey(bucket.slot, bucket.category), {
      slot: bucket.slot,
      category: bucket.category,
      articleCount: bucket.articleCount,
      totalTokenCount: bucket.totalTokenCount,
      filteredTokenCount: bucket.filteredTokenCount,
      stopwordExcludedCount: bucket.stopwordExcludedCount,
      counts: new Map(bucket.items.map((item) => [item.keyword, { posTag: item.posTag, count: item.count }])),
    })
  }
  return map
}

/**
 * 저장 형식으로 되돌린다. items는 여기서 한 번 정렬해 둔다 — 조회할 때마다 수천 건을 다시
 * 정렬하지 않기 위해서다(정렬 기준은 aggregate.ts와 같은 빈도 내림차순 · 동률 가나다순).
 */
function toStoredBuckets(buckets: Map<string, MutableBucket>): DailyBucket[] {
  return [...buckets.values()]
    .map((bucket) => ({
      slot: bucket.slot,
      category: bucket.category,
      articleCount: bucket.articleCount,
      totalTokenCount: bucket.totalTokenCount,
      filteredTokenCount: bucket.filteredTokenCount,
      stopwordExcludedCount: bucket.stopwordExcludedCount,
      items: [...bucket.counts.entries()]
        .map(([keyword, { posTag, count }]) => ({ keyword, posTag, count }))
        .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'ko')),
    }))
    .sort((a, b) => a.slot - b.slot || a.category.localeCompare(b.category))
}

function ensureBucket(
  buckets: Map<string, MutableBucket>,
  slot: number,
  category: DailyBucketCategory
): MutableBucket {
  const key = bucketKey(slot, category)
  const existing = buckets.get(key)
  if (existing) return existing

  const created: MutableBucket = {
    slot,
    category,
    articleCount: 0,
    totalTokenCount: 0,
    filteredTokenCount: 0,
    stopwordExcludedCount: 0,
    counts: new Map(),
  }
  buckets.set(key, created)
  return created
}

/**
 * 기사 1건이 들어갈 슬롯을 정한다. **발행 날짜가 이 캐시의 날짜와 같을 때만** 0~7 구간에
 * 넣는다 — RSS 피드에는 전날 이전 기사도 섞여 오므로 시(hour)만 보면 어제 14시 기사가 오늘의
 * 13~15시 집계로 들어간다(`OTHER_DATE_SLOT` 주석의 실측). 나머지 둘은 슬롯을 나눠 서로 다른
 * 문장으로 설명할 수 있게 한다.
 */
export function resolveBucketSlot(publishedAt: string | undefined, dateKey: string): number {
  if (!publishedAt) return UNKNOWN_SLOT

  const published = new Date(publishedAt)
  if (Number.isNaN(published.getTime())) return UNKNOWN_SLOT
  if (toLocalDateKey(published) !== dateKey) return OTHER_DATE_SLOT

  return resolveTimeSlotIndex(publishedAt) ?? UNKNOWN_SLOT
}

/** `YYYYMMDD` 하루에 속한 run id들을 오래된 순으로. run id 앞 8자리가 곧 로컬 날짜다. */
async function listRunIdsOfDate(dateKey: string): Promise<string[]> {
  const runs = await listRuns()
  return runs
    .filter((run) => run.id.slice(0, 8) === dateKey)
    .map((run) => run.id)
    .sort()
}

/**
 * 아직 반영되지 않은 run들을 훑어 버킷에 더한다. 이미 집계한 URL은 건너뛴다 — 같은 기사가 여러
 * run에 중복 수집되므로(하루 2,520건 중 서로 다른 URL 937건) 이 중복 제거가 없으면 "언급 기사 수"가
 * 크롤을 돌린 횟수만큼 부풀려진다.
 *
 * 개별 기사 읽기 실패는 값으로 격리하고 건너뛴 수만 센다(docs/CONVENTIONS.md §7). **실패한
 * URL은 `seenUrls`에 넣지 않는다** — 다른 run에 같은 기사의 멀쩡한 사본이 있으면 그쪽으로
 * 집계될 수 있어야 하기 때문이다.
 */
async function ingestRuns(
  dateKey: string,
  runIds: readonly string[],
  seenUrls: Set<string>,
  buckets: Map<string, MutableBucket>,
  stopwords: ReadonlySet<string>
): Promise<number> {
  let skippedArticleCount = 0

  for (const runId of runIds) {
    const metas = await listArticles(runId)
    for (const meta of metas) {
      if (seenUrls.has(meta.url)) continue

      let content: string
      try {
        content = (await readArticle(runId, meta.id)).content
      } catch (error) {
        skippedArticleCount += 1
        console.warn(`[daily-keywords] 기사 읽기 실패로 건너뜁니다: ${runId}/${meta.id}`, error)
        continue
      }

      seenUrls.add(meta.url)
      const analysis = await analyzeArticleContent(content, stopwords)
      const bucket = ensureBucket(
        buckets,
        resolveBucketSlot(meta.publishedAt, dateKey),
        meta.category ?? UNKNOWN_CATEGORY_KEY
      )

      bucket.articleCount += 1
      bucket.totalTokenCount += analysis.totalTokenCount
      bucket.filteredTokenCount += analysis.filteredTokenCount
      bucket.stopwordExcludedCount += analysis.stopwordExcludedCount
      for (const candidate of analysis.keywords) {
        const current = bucket.counts.get(candidate.keyword)
        if (current) {
          current.count += 1
        } else {
          bucket.counts.set(candidate.keyword, { posTag: candidate.posTag, count: 1 })
        }
      }
    }
  }

  return skippedArticleCount
}

export interface EnsureDailyKeywordsResult {
  file: DailyKeywordsFile
  /** 이번 호출에서 새로 훑은 run 수. 0이면 캐시를 그대로 쓴 것이다. */
  ingestedRunCount: number
  /** 이번 호출에서 읽기에 실패해 건너뛴 기사 수. 캐시 적중이면 항상 0이다. */
  skippedArticleCount: number
}

/**
 * 날짜 하루치 시간대별 집계를 준비한다. 캐시가 있으면 **새로 생긴 run만** 증분 반영하고,
 * 불용어가 바뀌었거나 `force`면 통째로 다시 만든다.
 *
 * 하루치를 매번 처음부터 토큰화하면 기사 수천 건에 수십 초가 걸린다. 그런데 언급 기사 수는
 * 겹치지 않는 기사 집합끼리 더할 수 있으므로(`daily-keyword-repository.ts`의 버킷 주석) 새 run의
 * 새 기사만 +1 해 주면 전체를 다시 센 것과 정확히 같은 결과가 나온다 — 크롤을 계속 돌리는 당일
 * 날짜에서도 두 번째 조회부터는 새로 늘어난 기사분만 계산한다.
 */
export async function ensureDailyKeywords(
  dateKey: string,
  options: { force?: boolean } = {}
): Promise<EnsureDailyKeywordsResult> {
  const [runIds, stopwords] = await Promise.all([listRunIdsOfDate(dateKey), getStopwordSet()])
  const signature = stopwordSignature(stopwords)
  const cached = options.force ? null : await readDailyKeywords(dateKey)

  // 불용어가 바뀌면 이미 세어 둔 items가 전부 틀어진다 — 증분으로는 되돌릴 수 없어 처음부터 다시 만든다.
  // (버전이 다른 캐시는 애초에 `readDailyKeywords`의 스키마 검증에서 걸려 null로 온다.)
  const reusable =
    cached !== null && cached.countBasis === 'article' && cached.stopwordSignature === signature
      ? cached
      : null

  const seenUrls = new Set(reusable?.seenUrls ?? [])
  const buckets = toMutableBuckets(reusable?.buckets ?? [])
  const alreadyIngested = new Set(reusable?.runIds ?? [])
  const pendingRunIds = runIds.filter((runId) => !alreadyIngested.has(runId))

  if (reusable && pendingRunIds.length === 0) {
    return { file: reusable, ingestedRunCount: 0, skippedArticleCount: 0 }
  }

  const skippedArticleCount = await ingestRuns(
    dateKey,
    pendingRunIds,
    seenUrls,
    buckets,
    stopwords
  )

  const file: DailyKeywordsFile = {
    version: CURRENT_DAILY_CACHE_VERSION,
    date: dateKey,
    builtAt: new Date().toISOString(),
    countBasis: 'article',
    stopwordSignature: signature,
    runIds,
    seenUrls: [...seenUrls],
    buckets: toStoredBuckets(buckets),
  }
  await writeDailyKeywords(file)

  return { file, ingestedRunCount: pendingRunIds.length, skippedArticleCount }
}

// ────────────────────────────────────────────────────────────────────────
// 조회(순수 함수) — 여기부터는 파일을 다시 읽지 않고 메모리에서 합산만 한다.
// ────────────────────────────────────────────────────────────────────────

/** 한 시간대(또는 전체)의 합산 결과. `items`는 정렬 전 상태이며 키워드로 바로 조회할 수 있다. */
export interface SlotAggregate {
  articleCount: number
  uncategorizedCount: number
  totalTokenCount: number
  filteredTokenCount: number
  stopwordExcludedCount: number
  items: Map<string, { posTag: PosTag; count: number }>
}

/**
 * `slot`이 null이면 **모든 버킷**(발행 시각 미상 포함)을, 숫자면 그 구간 버킷만 합산한다.
 *
 * 카테고리 판정은 `matchesCategoryFilter`를 그대로 쓴다 — 필터가 없으면 전부 통과, 필터가 있으면
 * 미상(`UNKNOWN_CATEGORY_KEY`)은 제외라는 규칙이 기사 목록·run 단위 키워드와 어긋나면 안 된다.
 */
export function selectSlotAggregate(
  file: DailyKeywordsFile,
  slot: number | null,
  categories: PressCategory[] | undefined
): SlotAggregate {
  const categoryFilterActive = (categories?.length ?? 0) > 0
  const result: SlotAggregate = {
    articleCount: 0,
    uncategorizedCount: 0,
    totalTokenCount: 0,
    filteredTokenCount: 0,
    stopwordExcludedCount: 0,
    items: new Map(),
  }

  for (const bucket of file.buckets) {
    if (slot !== null && bucket.slot !== slot) continue

    if (bucket.category === UNKNOWN_CATEGORY_KEY) {
      if (categoryFilterActive) {
        // 필터에 걸려 빠진 미상 기사는 조용히 사라지지 않고 건수로 보고된다(Task 026과 같은 계약).
        result.uncategorizedCount += bucket.articleCount
        continue
      }
    } else if (!matchesCategoryFilter(bucket.category, categories)) {
      continue
    }

    result.articleCount += bucket.articleCount
    result.totalTokenCount += bucket.totalTokenCount
    result.filteredTokenCount += bucket.filteredTokenCount
    result.stopwordExcludedCount += bucket.stopwordExcludedCount
    for (const item of bucket.items) {
      const current = result.items.get(item.keyword)
      if (current) {
        current.count += item.count
      } else {
        result.items.set(item.keyword, { posTag: item.posTag, count: item.count })
      }
    }
  }

  return result
}

/** 시간대 셀렉터가 "이 구간에 기사 몇 건"을 보여줄 수 있도록 슬롯별 기사 수를 뽑는다. */
export function selectSlotArticleCounts(
  file: DailyKeywordsFile,
  categories: PressCategory[] | undefined
): number[] {
  return TIME_SLOTS.map((slot) => selectSlotAggregate(file, slot.index, categories).articleCount)
}

/** 발행 시각을 몰라 어느 구간에도 넣지 못한 기사 수(카테고리 필터 적용 후). */
export function selectUnknownTimeArticleCount(
  file: DailyKeywordsFile,
  categories: PressCategory[] | undefined
): number {
  return selectSlotAggregate(file, UNKNOWN_SLOT, categories).articleCount
}

/** 발행 날짜가 이 날짜와 달라 구간에 넣지 않은 기사 수(대개 전날 기사가 피드에 남아 있는 경우). */
export function selectOtherDateArticleCount(
  file: DailyKeywordsFile,
  categories: PressCategory[] | undefined
): number {
  return selectSlotAggregate(file, OTHER_DATE_SLOT, categories).articleCount
}

export interface DailyKeywordItem {
  keyword: string
  posTag: PosTag
  /** 이 시간대에 그 키워드를 언급한 기사 수. */
  count: number
  /**
   * 직전 시간대의 같은 값. **비교할 구간 자체가 없으면 null**이다(전체 시간대를 보고 있거나,
   * 하루의 첫 구간 0~3시라 같은 날 안에 앞 구간이 없는 경우). 0과 null은 다른 뜻이다 — 0은
   * "직전 구간에는 한 건도 없었다"(= 새로 뜬 키워드)이고 null은 "비교 자체가 성립하지 않는다"다.
   */
  previousCount: number | null
  /** `count - previousCount`. previousCount가 null이면 null. */
  delta: number | null
}

/**
 * 선택 구간 랭킹에 직전 구간 대비 증감을 붙인다. **직전 구간에만 있고 선택 구간에는 없는
 * 키워드는 넣지 않는다** — 이 목록은 "이 시간대의 랭킹"이지 두 구간의 합집합이 아니다.
 */
export function buildDailyKeywordItems(
  current: SlotAggregate,
  previous: SlotAggregate | null
): DailyKeywordItem[] {
  return [...current.items.entries()]
    .map(([keyword, { posTag, count }]) => {
      const previousCount = previous ? (previous.items.get(keyword)?.count ?? 0) : null
      return {
        keyword,
        posTag,
        count,
        previousCount,
        delta: previousCount === null ? null : count - previousCount,
      }
    })
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'ko'))
}

/** 화면의 「분석 요약」 카드가 그대로 쓰는 5개 수치. run 단위와 같은 모양이라 컴포넌트를 공유한다. */
export function toAnalysisSummary(aggregate: SlotAggregate): AnalysisSummary {
  return {
    articleCount: aggregate.articleCount,
    totalTokenCount: aggregate.totalTokenCount,
    filteredTokenCount: aggregate.filteredTokenCount,
    stopwordExcludedCount: aggregate.stopwordExcludedCount,
    uniqueKeywordCount: aggregate.items.size,
  }
}
