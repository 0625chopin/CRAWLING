import 'server-only'

import pLimit from 'p-limit'

import { saveArticle } from '@/lib/storage/article-repository'
import { getPress } from '@/lib/storage/press-repository'
import { createRun, finishRun } from '@/lib/storage/run-repository'
import type { Article } from '@/lib/types/article'
import {
  crawlStartRequestSchema,
  type CrawlStartRequest,
  type PressRunStatus,
  type RunProgress,
} from '@/lib/types/crawl-run'
import type { PressSource } from '@/lib/types/press'

import { resolveMaxArticlesPerPress } from './article-parser'
import { crawlerConfig } from './config'
import { crawlPress, type PressCrawlResult } from './press-crawler'

/**
 * 실행(run) 하나의 백그라운드 상태. `progress`는 `getRunProgress`가 그대로 돌려주는 참조라,
 * 아래 `runOnePress`의 `onArticleDone` 훅이 이 객체의 필드를 직접 mutate하면 폴링 쪽(다음
 * 회차 API)이 별도 동기화 없이 최신 값을 읽는다.
 */
interface RunJob {
  runId: string
  /**
   * 014B가 소비할 중단 플래그. 이번 회차(014A)는 `abortRun`이 이 값을 세우는 것까지만 한다 —
   * 크롤 루프가 이 값을 읽어 실제로 중단하는 것과 `run-meta.json`에 `status: 'aborted'`를 쓰는
   * 것은 다음 회차 몫이다(docs/ROADMAP/work/02.크롤파이프라인.md Task 014B). 여기서 값을 세워도
   * 아직 아무 동작에도 연결돼 있지 않다 — 레지스트리 구조만 이 값을 담을 수 있게 해 둔다.
   */
  aborted: boolean
  progress: RunProgress
}

/**
 * `next dev`의 HMR이 모듈을 다시 평가해도 진행 중인 잡이 사라지지 않도록 globalThis에 붙인다.
 * 모듈 스코프 변수로 두면 소스 저장 한 번에 이 Map이 새로 만들어져 "방금 시작한 run"이 다음
 * 조회부터 사라진다 — 기준 구현은 `lib/crawler/browser.ts:5-11`(docs/CONVENTIONS.md §5,
 * docs/DECISIONS.md 인접 사례).
 */
const globalForRuns = globalThis as unknown as { __crawlRuns?: Map<string, RunJob> }
globalForRuns.__crawlRuns ??= new Map()
const runRegistry = globalForRuns.__crawlRuns

function recomputeOverallPercent(progress: RunProgress): void {
  const totalTarget = progress.pressStatuses.reduce((sum, item) => sum + item.target, 0)
  const totalCollected = progress.pressStatuses.reduce((sum, item) => sum + item.collected, 0)
  progress.overallPercent = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0
}

/**
 * 언론사 전체 실패 원문 메시지를 화면 설계서 01이 기대하는 정형 라벨로 다듬는다 — HTML은
 * `타임아웃`/`셀렉터 불일치`, RSS는 `피드 파싱 실패`/`피드 응답 없음`(`docs/screens/01-crawl-run.md`
 * §상태별 화면 ⑤). `press-crawler`·`fetchHtml`·`fetchFeed`가 만드는 원문은 자유 문장이라 그대로
 * 내보내면 두 단어 라벨과 글자 그대로 맞지 않는다(6일차 화면 워크스트림 리뷰 지적,
 * `docs/CONVENTIONS.md` §7 "원시 오류를 화면까지 흘리지 않는다").
 *
 * ⚠️ 근사치다. HTML의 `타임아웃`은 실제로는 `fetchHtml`이 실패하는 모든 사유(DNS 실패·연결
 * 거부·인증서 오류 포함)를 가리킨다 — 설계서가 라벨을 두 개로만 못 박아서 생긴 단순화다. 더
 * 세분화된 라벨이 필요해지면 설계서부터 늘려야 한다(`docs/DECISIONS.draft.크롤파이프라인.md`).
 */
function normalizeFailReason(press: PressSource, rawError: string): string {
  if (press.sourceType === 'html') {
    // crawlHtmlPress가 "목록 페이지에서 기사 링크를 찾지 못했습니다"를 문자 그대로 쓴다
    // (press-crawler.ts) — 목록 페이지 자체는 열렸는데 셀렉터가 안 맞은 경우다.
    return rawError.includes('링크를 찾지 못했습니다') ? '셀렉터 불일치' : '타임아웃'
  }
  // fetchFeed가 XML 해석 실패("...해석할 수 없습니다")나 형식 불일치("...형식이 아닙니다")로
  // 던지는 문구는 피드 응답 자체는 받았다는 뜻이라 "피드 파싱 실패"로, 그 외(타임아웃·네트워크
  // 오류·비정상 상태 코드)는 "피드 응답 없음"으로 묶는다.
  return rawError.includes('해석할 수 없습니다') || rawError.includes('형식이 아닙니다')
    ? '피드 파싱 실패'
    : '피드 응답 없음'
}

/**
 * 언론사 하나를 크롤해 저장까지 마친다. `nextArticleId`는 실행 전체에서 유일해야 하는 4자리
 * 순번을 다음 값으로 내주는 클로저다 — 언론사가 어떤 순서로 끝나든 이 함수가 순번을 읽고
 * 증가시키는 구간은 동기 코드라(JS 단일 스레드) 두 언론사가 같은 번호를 받는 경쟁이 없다.
 * (D-012: `crawlPress`는 저장소를 모르고 `id` 없는 `ArticleDraft`만 돌려준다 — 전역 순번 배정과
 * 저장은 이 호출부, 즉 014A의 몫이다.)
 */
async function runOnePress(
  press: PressSource,
  runId: string,
  maxArticlesPerPress: number | undefined,
  status: PressRunStatus,
  progress: RunProgress,
  nextArticleId: () => string
): Promise<{ successCount: number; failCount: number }> {
  status.status = 'running'

  const result: PressCrawlResult = await crawlPress(
    press,
    runId,
    { maxArticlesPerPress },
    {
      onArticleDone: (_pressId, collected, target) => {
        status.collected = collected
        status.target = target
        progress.currentPressName = press.name
        progress.currentCollected = collected
        progress.currentTarget = target
        recomputeOverallPercent(progress)
      },
    }
  )

  for (const draft of result.articles) {
    const article: Article = { ...draft, id: nextArticleId() }
    await saveArticle(runId, article)
  }

  // 언론사 전체 실패(D-012: articles가 비고 failures가 1건)만 이 언론사를 'failed'로 표시한다.
  // 개별 기사 실패가 섞여도 일부라도 저장에 성공했으면 'done'이다 — 실행 전체의 성공/실패
  // 판정(run 단위 status)은 finishRun이 개수로 따로 계산한다.
  //
  // ⚠️ D-012 계약(`PressCrawlResult.failures`)은 "언론사 전체 실패"와 "요청 링크가 딱 1개였는데
  // 그게 개별 실패"를 구분하지 않는다 — 둘 다 articles: [] · failures.length === 1로 온다
  // (6일차 화면 워크스트림 리뷰가 짚은 엣지 케이스). 후자는 target(요청 링크 수) 자체가 1인
  // 드문 경우라 여기서는 같은 문구로 뭉갠다 — 상태가 'failed'로 보이는 것 자체는 두 경우
  // 모두 맞고, 어긋날 수 있는 것은 failReason 라벨뿐이다.
  const isTotalFailure = result.articles.length === 0 && result.failures.length > 0
  status.status = isTotalFailure ? 'failed' : 'done'
  if (isTotalFailure) {
    const rawReason = result.failures[0]?.error ?? ''
    status.failReason = normalizeFailReason(press, rawReason)
    status.rawFailReason = rawReason
  }
  recomputeOverallPercent(progress)

  return { successCount: result.articles.length, failCount: result.failures.length }
}

/**
 * 선택된 언론사들을 언론사 레벨 동시성 제한(D-013, `crawlerConfig.pressConcurrency`) 아래에서
 * 병렬로 돌리고, 끝나면 `finishRun`으로 실행을 마무리한다. `startRun`이 기다리지 않는 부분이다.
 */
async function runInBackground(
  runId: string,
  pressSources: (PressSource | null)[],
  pressStatuses: PressRunStatus[],
  progress: RunProgress,
  maxArticlesPerPress: number | undefined
): Promise<void> {
  let nextSeq = 1
  const nextArticleId = () => String(nextSeq++).padStart(4, '0')

  const limit = pLimit(crawlerConfig.pressConcurrency)

  const counts = await Promise.all(
    pressSources.map((press, index) =>
      limit(async () => {
        // getPress가 null을 준 언론사(요청 시점엔 있었지만 사라진 id)는 startRun이 이미
        // pressStatuses를 'failed'로 채워 두었다 — 여기서는 집계만 반영하고 크롤을 시도하지 않는다.
        if (!press) return { successCount: 0, failCount: 1 }
        return runOnePress(press, runId, maxArticlesPerPress, pressStatuses[index], progress, nextArticleId)
      })
    )
  )

  const successCount = counts.reduce((sum, count) => sum + count.successCount, 0)
  const failCount = counts.reduce((sum, count) => sum + count.failCount, 0)

  const finished = await finishRun(runId, { successCount, failCount })
  progress.status = finished.status
  progress.currentPressName = null
}

/**
 * 요청과 크롤의 수명을 분리한다. `runId`를 만들고 `run-meta.json`(status: `running`)을 기록한
 * 뒤 즉시 반환하고, 실제 크롤은 `runInBackground`가 계속 돈다 — 이 도구는 `next dev`/`next start`로
 * 도는 장수명 로컬 Node 프로세스를 전제하므로 이 방식이 성립한다(docs/ROADMAP.md Task 014
 * 구현 규칙, PRD §실행 환경). 서버리스 배포는 애초에 대상이 아니다.
 */
export async function startRun(input: CrawlStartRequest): Promise<{ runId: string }> {
  const { pressIds, maxArticlesPerPress } = crawlStartRequestSchema.parse(input)

  const pressSources = await Promise.all(pressIds.map((id) => getPress(id)))
  const run = await createRun(pressIds)

  const defaultTarget = resolveMaxArticlesPerPress(maxArticlesPerPress)
  const pressStatuses: PressRunStatus[] = pressIds.map((id, index) => {
    const press = pressSources[index]
    if (press) {
      return { pressId: press.id, name: press.name, status: 'waiting', collected: 0, target: defaultTarget }
    }
    // 체크박스 선택 이후 언론사가 삭제되는 등 드문 경합. 크롤을 시도하지 않고 바로 실패로 기록한다.
    return {
      pressId: id,
      name: id,
      status: 'failed',
      collected: 0,
      target: 0,
      failReason: '존재하지 않는 언론사입니다',
    }
  })

  const progress: RunProgress = {
    runId: run.id,
    status: 'running',
    overallPercent: 0,
    currentPressName: null,
    currentCollected: 0,
    currentTarget: 0,
    pressStatuses,
  }

  runRegistry.set(run.id, { runId: run.id, aborted: false, progress })

  // 반환은 여기서 끝난다. 아래는 await하지 않고 백그라운드로 흘려보낸다 — startRun 호출자는
  // 크롤 완료를 기다리지 않는다(Task 014 DoD "1초 이내에 runId 반환").
  void runInBackground(run.id, pressSources, pressStatuses, progress, maxArticlesPerPress)

  return { runId: run.id }
}

/**
 * 진행 상태는 메모리(레지스트리)에서 읽는다 — `run-meta.json`은 최종 결과 확인용이다(Task 014
 * 구현 규칙 "진행 상태는 메모리, 최종 결과는 파일"). 서버 재시작으로 레지스트리가 비었을 때
 * `run-meta.json`을 보고 복구하는 것은 014B 몫이라 여기서는 찾지 못하면 예외로 알린다.
 */
export function getRunProgress(runId: string): RunProgress {
  const job = runRegistry.get(runId)
  if (!job) {
    throw new Error(`실행을 찾을 수 없습니다: ${runId}`)
  }
  return job.progress
}

/**
 * 중단 플래그만 세운다. 이 값을 크롤 루프가 읽어 다음 기사부터 요청하지 않게 하는 것, 진행 중인
 * run을 `run-meta.json`에 `status: 'aborted'`로 기록하는 것, 이미 `running`인 run이 있을 때
 * 409로 새 실행을 거절하는 것은 모두 014B 몫이다(docs/ROADMAP/work/02.크롤파이프라인.md
 * Task 014B). 지금은 레지스트리가 이 값을 담을 수 있다는 것만 보장한다.
 */
export function abortRun(runId: string): void {
  const job = runRegistry.get(runId)
  if (!job) {
    throw new Error(`실행을 찾을 수 없습니다: ${runId}`)
  }
  job.aborted = true
}
