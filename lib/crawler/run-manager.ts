import 'server-only'

import pLimit from 'p-limit'

import { listArticles, saveArticle } from '@/lib/storage/article-repository'
import { getPress } from '@/lib/storage/press-repository'
import { createRun, finishRun, getRun, updateRunMeta } from '@/lib/storage/run-repository'
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
   * 중단 플래그. `abortRun`이 세우고, `runInBackground`(다음 언론사를 시작할지)와
   * `runOnePress`가 `crawlPress`에 넘기는 `isAborted` 훅(다음 기사를 요청할지, press-crawler.ts의
   * `collectArticlePages`가 읽는다)이 함께 읽는다 — 진행 중인 Playwright 페이지는 강제로 죽이지
   * 않고, "아직 시작하지 않은 다음 단위"만 건너뛰는 방식이다(D-016 이월분).
   */
  aborted: boolean
  progress: RunProgress
}

/**
 * 이미 `running` 상태인 run이 있을 때 새 실행 시도를 거절하는 신호. HTTP를 모르는 이 계층은
 * 상태 코드를 직접 정하지 않지만, 이름과 타입으로 라우트(Task 015A)가 다른 예외와 구분해 409로
 * 매핑할 수 있게 한다. `lib/api/response.ts`의 `withErrorBoundary`는 모든 예외를 500 문구로
 * 뭉개므로(D-008), 015A는 이 에러를 그 경계 안에서 별도로 `instanceof` 분기하거나 그 바깥에서
 * 먼저 걸러내야 한다 — 015A가 구현할 때 참고.
 */
export class RunAlreadyRunningError extends Error {
  constructor(public readonly runningRunId: string) {
    super(`이미 실행 중인 작업이 있습니다: ${runningRunId}`)
    this.name = 'RunAlreadyRunningError'
  }
}

/**
 * 이미 종료된(running이 아닌) run을 다시 중단하려 할 때 던진다. `RunAlreadyRunningError`와 같은
 * 이유로 문자열 대신 타입으로 올렸다 — `abortRun`이 이 문구를 두 곳(레지스트리 경로·디스크 복구
 * 경로)에서 던지므로, 문구만으로 판정하던 소비자가 한쪽만 고치는 사고를 막는다(8일차 교차검증
 * 후속). 한국어 메시지는 화면이 그대로 보여주므로 바꾸지 않았다.
 */
export class RunNotAbortableError extends Error {
  constructor(public readonly runId: string) {
    super(`이미 종료된 실행은 중단할 수 없습니다: ${runId}`)
    this.name = 'RunNotAbortableError'
  }
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
 * 언론사 1곳이 실행 집계에 보태는 몫. **`skippedCount`는 중단 때문에 요청조차 하지 않은 기사 수**로,
 * `failCount`와 절대 합치지 않는다 — 합쳤더니 중단 버튼을 눌렀을 뿐인 실행이 "실패 43건"으로
 * 기록됐다(I-017).
 */
interface RunCounts {
  successCount: number
  failCount: number
  skippedCount: number
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
  nextArticleId: () => string,
  job: RunJob
): Promise<RunCounts> {
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
      // press-crawler.ts의 collectArticlePages가 다음 기사를 요청하기 직전에 이 값을 읽는다 —
      // 이미 시작된 요청은 끝까지 기다리고, 아직 시작하지 않은 요청만 건너뛴다.
      isAborted: () => job.aborted,
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
  if (job.aborted && result.articles.length === 0) {
    // 이 언론사는 시작은 했지만 중단 시점이 일러 한 건도 건지지 못했다 — 셀렉터 불일치·타임아웃
    // 등 실제 실패로 오인되지 않도록 'failed'로 굳히지 않고 'waiting'으로 되돌린다. run 전체
    // 상태는 어차피 아래(runInBackground)에서 'aborted'로 표시된다.
    status.status = 'waiting'
    status.collected = 0
  } else {
    status.status = isTotalFailure ? 'failed' : 'done'
    if (isTotalFailure) {
      const rawReason = result.failures[0]?.error ?? ''
      status.failReason = normalizeFailReason(press, rawReason)
      status.rawFailReason = rawReason
    }
  }
  recomputeOverallPercent(progress)

  return {
    successCount: result.articles.length,
    failCount: result.failures.length,
    skippedCount: result.skipped.length,
  }
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
  maxArticlesPerPress: number | undefined,
  job: RunJob
): Promise<void> {
  let nextSeq = 1
  const nextArticleId = () => String(nextSeq++).padStart(4, '0')

  const limit = pLimit(crawlerConfig.pressConcurrency)

  const counts = await Promise.all(
    pressSources.map((press, index) =>
      limit(async () => {
        // getPress가 null을 준 언론사(요청 시점엔 있었지만 사라진 id)는 startRun이 이미
        // pressStatuses를 'failed'로 채워 두었다 — 여기서는 집계만 반영하고 크롤을 시도하지 않는다.
        if (!press) return { successCount: 0, failCount: 1, skippedCount: 0 }
        // 이 언론사의 차례가 됐을 때(pressConcurrency 대기열에서 빠져나왔을 때) 이미 중단
        // 상태라면 아예 시작하지 않는다 — 'waiting'으로 남아 "시도하지 않았다"를 그대로 보여준다.
        // 이미 실행 중이던 다른 언론사의 Playwright 페이지는 여기서 건드리지 않는다.
        //
        // skippedCount도 0이다: 목록·피드조차 열지 않았으므로 이 언론사에서 몇 건을 건너뛴 것인지
        // 알 수 없다. 요청 시 지정한 최대 건수로 추정해 채우면 파일에 지어낸 숫자가 남는다.
        if (job.aborted) return { successCount: 0, failCount: 0, skippedCount: 0 }
        return runOnePress(press, runId, maxArticlesPerPress, pressStatuses[index], progress, nextArticleId, job)
      })
    )
  )

  const successCount = counts.reduce((sum, count) => sum + count.successCount, 0)
  const failCount = counts.reduce((sum, count) => sum + count.failCount, 0)
  const skippedCount = counts.reduce((sum, count) => sum + count.skippedCount, 0)

  // 종료 직전에야 채운다 — 화면(016B)의 완료/부분 실패/중단 요약이 폴링 하나로 이 값을
  // 읽는다(runProgressSchema 주석). 진행 중에는 0인 채로 두어도 진행 중 화면은 이 필드를
  // 쓰지 않으므로 문제가 없다.
  progress.successCount = successCount
  progress.failCount = failCount
  progress.skippedCount = skippedCount

  const finished = await finishRun(runId, { successCount, failCount, skippedCount })
  // finishRun은 실패 건수로만 done/failed/partial-failed를 산출한다(D-007 ③) — 'aborted'는
  // 그 계산 밖이라 여기서 덮어쓴다. successCount/failCount/finishedAt은 finishRun이 이미 기록한
  // 값을 그대로 둔다(중단 시점까지 실제로 수집·저장한 결과이므로 보존한다).
  const finalRun = job.aborted ? await updateRunMeta(runId, { status: 'aborted' }) : finished
  progress.status = finalRun.status
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

  // 동시에 여러 run을 시작하는 것은 막는다(로컬 1인 도구 + Playwright 브라우저 자원 공유).
  // 레지스트리에 남은 잡 중 아직 'running'인 것이 있으면 거절한다 — 서버 재시작으로 죽은
  // 프로세스의 고아 run은 이 레지스트리에 애초에 없으므로(비어서 시작) 여기 걸리지 않는다.
  const runningJob = [...runRegistry.values()].find((job) => job.progress.status === 'running')
  if (runningJob) {
    throw new RunAlreadyRunningError(runningJob.runId)
  }

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
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
  }

  const job: RunJob = { runId: run.id, aborted: false, progress }
  runRegistry.set(run.id, job)

  // 반환은 여기서 끝난다. 아래는 await하지 않고 백그라운드로 흘려보낸다 — startRun 호출자는
  // 크롤 완료를 기다리지 않는다(Task 014 DoD "1초 이내에 runId 반환").
  void runInBackground(run.id, pressSources, pressStatuses, progress, maxArticlesPerPress, job)

  return { runId: run.id }
}

/**
 * 레지스트리에 없는 runId를 `run-meta.json`으로 복구한다 — 서버 재시작으로 메모리 잡이 사라진
 * 뒤 조회되는 경우다(이번 프로세스가 이 run을 잡으로 들고 있어 본 적이 없다는 뜻이므로, 파일이
 * 아직 'running'이면 그 자체가 고아라는 증거다). `getRun`이 없는 runId는 예외로 던지므로 여기서
 * 따로 존재 확인을 하지 않는다.
 *
 * 언론사별 상세(진행률·실패 사유)는 메모리에만 있던 값이라 재구성할 수 없다 — `listArticles`로
 * 실제 저장된 기사 수만 언론사별로 세어 `collected`/`target`을 채우고, 하나라도 건졌으면 'done',
 * 아니면 'waiting'으로 본다(근거 없이 'failed'·failReason을 지어내지 않는다).
 */
async function recoverRunProgress(runId: string): Promise<RunProgress> {
  const run = await getRun(runId)

  const finalRun =
    run.status === 'running'
      ? await updateRunMeta(runId, { status: 'aborted', finishedAt: run.finishedAt ?? new Date().toISOString() })
      : run

  const articles = await listArticles(runId)
  const collectedByPress = new Map<string, number>()
  for (const article of articles) {
    collectedByPress.set(article.pressId, (collectedByPress.get(article.pressId) ?? 0) + 1)
  }

  const pressStatuses: PressRunStatus[] = await Promise.all(
    finalRun.targetPressIds.map(async (pressId) => {
      const press = await getPress(pressId)
      const collected = collectedByPress.get(pressId) ?? 0
      return {
        pressId,
        name: press?.name ?? pressId,
        status: collected > 0 ? 'done' : 'waiting',
        collected,
        target: collected,
      }
    })
  )

  return {
    runId: finalRun.id,
    status: finalRun.status,
    overallPercent: 100,
    currentPressName: null,
    currentCollected: 0,
    currentTarget: 0,
    pressStatuses,
    // run-meta.json이 이미 들고 있는 최종 집계다 — 복구 경로도 화면(016B)의 완료 요약에
    // 필요한 값이라 재구성해서 만들지 않고 그대로 옮긴다(runProgressSchema 주석).
    successCount: finalRun.successCount,
    failCount: finalRun.failCount,
    skippedCount: finalRun.skippedCount,
    // 레지스트리가 아니라 디스크에서 재구성한 스냅샷임을 알린다 — pressStatuses[].target이
    // 실제 목표치가 아니라 collected와 같은 근사값이라는 뜻이다(위 함수 doc 참고, 8일차
    // 교차검증 후속). 화면은 이 플래그로 "확정 완료"가 아니라 "복구된 값"임을 구분해 그릴 수 있다.
    recovered: true,
  }
}

/**
 * 진행 상태는 우선 메모리(레지스트리)에서 읽는다 — `run-meta.json`은 최종 결과 확인용이다
 * (Task 014 구현 규칙 "진행 상태는 메모리, 최종 결과는 파일"). 레지스트리에 없으면(서버 재시작
 * 등으로 이 프로세스가 이 run을 잡으로 들고 있어 본 적이 없으면) `run-meta.json`으로 복구한다 —
 * 여기서 `status: 'running'`인 채로 남은 run을 조회 시점에 `aborted`로 못박는다(Task 014B DoD).
 * 파일도 없는 진짜 없는 runId만 예외로 알린다.
 */
export async function getRunProgress(runId: string): Promise<RunProgress> {
  const job = runRegistry.get(runId)
  if (job) return job.progress
  return recoverRunProgress(runId)
}

/**
 * 중단을 요청한다. 이 프로세스가 이 run을 잡으로 들고 있으면(레지스트리에 있으면) 플래그만
 * 세운다 — 그 값을 `runInBackground`(다음 언론사)와 `press-crawler.ts`의 `collectArticlePages`
 * (다음 기사)가 읽어 실제로 멈춘다. 진행 중인 Playwright 페이지는 강제로 죽이지 않는다.
 *
 * 레지스트리에 없으면(서버 재시작으로 고아가 된 run) 멈출 살아있는 루프가 이 프로세스에 없다 —
 * `run-meta.json`이 아직 'running'이면 직접 'aborted'로 마무리하고, 이미 끝난 run이면 예외로
 * 알린다(끝난 실행은 중단할 대상이 아니다).
 */
export async function abortRun(runId: string): Promise<void> {
  const job = runRegistry.get(runId)
  if (job) {
    // 이미 끝난 run(레지스트리에는 남아 있지만 progress.status가 종료 상태)은 아래 디스크
    // 경로와 같은 규칙으로 거절한다 — 레지스트리에 있느냐 없느냐로 "중단 가능 여부" 판정이
    // 갈리면 015A가 같은 상황을 두 가지로 다르게 처리해야 한다.
    if (job.progress.status !== 'running') {
      throw new RunNotAbortableError(runId)
    }
    job.aborted = true
    return
  }

  const run = await getRun(runId) // 존재하지 않는 runId는 여기서 RunNotFoundError로 알려진다
  if (run.status !== 'running') {
    throw new RunNotAbortableError(runId)
  }
  await updateRunMeta(runId, { status: 'aborted', finishedAt: new Date().toISOString() })
}
