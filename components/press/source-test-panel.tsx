'use client'

import { useState } from 'react'
import { CircleCheckBig, CircleX, FlaskConical, LoaderCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ApiRequestError,
  testPressSource,
  type PressSourceTestResult,
} from '@/lib/api/press-client'

/** 요약 평균 길이가 이 미만이면 본문 전문 수집을 권한다(docs/screens/04-press-manage.md §설계 결정 근거 3). */
const SHORT_SUMMARY_THRESHOLD = 200

export type SourceTestPanelProps =
  | { sourceType: 'rss'; feedUrl: string }
  | { sourceType: 'html'; listUrl: string; articleLinkSelector: string }

type TestState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; result: PressSourceTestResult }
  | { phase: 'error'; message: string }

/** 저장하지 않은 현재 입력값으로도 누를 수 있어야 하므로, 빈 값이면 버튼 자체를 비활성화한다. */
function isInputReady(props: SourceTestPanelProps): boolean {
  return props.sourceType === 'rss'
    ? props.feedUrl.trim().length > 0
    : props.listUrl.trim().length > 0 && props.articleLinkSelector.trim().length > 0
}

/**
 * 소스 테스트 상태 관리. 화면 설계서 와이어프레임은 테스트 버튼을 필드 **라벨과 같은 줄**에,
 * 결과 Alert를 입력 아래에 배치한다(`docs/screens/04-press-manage.md` §③-C) — 그 사이에
 * `Input`·설명문·검증 오류 문구가 끼어 있어 버튼과 결과를 한 DOM 블록으로 묶을 수 없다.
 * 그래서 상태는 여기 훅 하나로 모으고, 버튼(`SourceTestButton`)과 결과(`SourceTestResult`)를
 * `press-form-dialog.tsx`가 원하는 위치에 각각 배치한다. 두 방식(RSS/HTML) 모두 이 훅
 * 하나로 처리해 로직이 갈리지 않는다.
 */
export function useSourceTest(props: SourceTestPanelProps) {
  const [state, setState] = useState<TestState>({ phase: 'idle' })
  const ready = isInputReady(props)

  async function run() {
    setState({ phase: 'loading' })
    try {
      const result = await testPressSource(
        props.sourceType === 'rss'
          ? { sourceType: 'rss', feedUrl: props.feedUrl.trim() }
          : {
              sourceType: 'html',
              listUrl: props.listUrl.trim(),
              articleLinkSelector: props.articleLinkSelector.trim(),
            }
      )
      setState({ phase: 'success', result })
    } catch (error) {
      const message =
        error instanceof ApiRequestError || error instanceof Error
          ? error.message
          : '소스 테스트에 실패했습니다'
      setState({ phase: 'error', message })
    }
  }

  return { state, ready, run }
}

export interface SourceTestButtonProps {
  sourceType: 'rss' | 'html'
  ready: boolean
  loading: boolean
  onTest: () => void
}

/** RSS는 "피드 테스트", HTML은 "셀렉터 테스트" — 필드 라벨과 같은 줄에 배치한다(`justify-between`). */
export function SourceTestButton({ sourceType, ready, loading, onTest }: SourceTestButtonProps) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={!ready || loading} onClick={onTest}>
      {loading ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <FlaskConical className="size-3.5" aria-hidden="true" />
      )}
      {sourceType === 'rss' ? '피드 테스트' : '셀렉터 테스트'}
    </Button>
  )
}

export interface SourceTestResultProps {
  sourceType: 'rss' | 'html'
  state: TestState
}

/**
 * 결과 영역 — 스크린리더가 결과를 자동으로 읽도록 `role="status" aria-live="polite"`로 감싼다
 * (`docs/screens/04-press-manage.md` §접근성). 대기/로딩 중에는 빈 컨테이너만 남긴다.
 */
export function SourceTestResult({ sourceType, state }: SourceTestResultProps) {
  return (
    <div role="status" aria-live="polite">
      {state.phase === 'success' ? (
        <SourceTestResultAlert sourceType={sourceType} result={state.result} />
      ) : null}
      {state.phase === 'error' ? (
        <Alert variant="destructive">
          <CircleX aria-hidden="true" />
          <AlertTitle>
            {sourceType === 'rss' ? '피드를 읽을 수 없습니다' : '목록 페이지를 열 수 없습니다'}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function SourceTestResultAlert({
  sourceType,
  result,
}: {
  sourceType: 'rss' | 'html'
  result: PressSourceTestResult
}) {
  if (result.count === 0) {
    return (
      <Alert variant="destructive">
        <CircleX aria-hidden="true" />
        <AlertTitle>0개 발견</AlertTitle>
        <AlertDescription>
          {sourceType === 'rss'
            ? '피드에서 기사를 찾을 수 없습니다. 피드 URL이 올바른지 확인하세요.'
            : '셀렉터가 목록 페이지와 일치하지 않습니다. 목록 URL과 셀렉터가 실제 페이지 구조와 맞는지 확인하세요.'}
        </AlertDescription>
      </Alert>
    )
  }

  // RssSourceTestResult만 avgSummaryLength를 갖는다 — 이 필드 존재 여부로 방식을 좁힌다.
  if ('avgSummaryLength' in result) {
    const isShort = result.avgSummaryLength < SHORT_SUMMARY_THRESHOLD
    const remaining = result.count - result.samples.length

    return (
      <Alert>
        <CircleCheckBig aria-hidden="true" />
        <AlertTitle>
          기사 {result.count}건 · 요약 평균 {result.avgSummaryLength}자
        </AlertTitle>
        <AlertDescription>
          <ul className="list-disc space-y-0.5 pl-4">
            {result.samples.map((sample) => (
              <li key={sample.link} className="truncate">
                {sample.title}
              </li>
            ))}
          </ul>
          {remaining > 0 ? <p>… 외 {remaining}건</p> : null}
          {/* 요약 평균 길이는 이 화면에서 사용자가 내려야 할 유일한 판단(전문을 긁을지)의
              근거다 — 색상·아이콘이 아니라 텍스트로 노출한다(docs/CONVENTIONS.md §8). */}
          <p>
            {isShort
              ? '요약이 짧습니다 — 본문 전문 수집을 켜는 것을 권합니다.'
              : '요약이 충분히 길어 본문 전문 수집 없이도 키워드 분석이 가능합니다.'}
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  const remaining = result.count - result.samples.length
  return (
    <Alert>
      <CircleCheckBig aria-hidden="true" />
      <AlertTitle>링크 {result.count}개 발견</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-0.5 pl-4">
          {result.samples.map((link) => (
            <li key={link} className="truncate font-mono text-xs">
              {link}
            </li>
          ))}
        </ul>
        {remaining > 0 ? <p>… 외 {remaining}개</p> : null}
      </AlertDescription>
    </Alert>
  )
}

/**
 * 버튼 + 결과를 한 블록으로 쌓은 편의 컴포넌트. `press-form-dialog.tsx`는 와이어프레임 배치를
 * 그대로 맞추려고 `useSourceTest`/`SourceTestButton`/`SourceTestResult`를 직접 조합해 쓰지만,
 * 라벨 줄에 붙일 필요가 없는 곳(예: 향후 재사용)에서는 이 컴포넌트 하나로 충분하다.
 */
export function SourceTestPanel(props: SourceTestPanelProps) {
  const { state, ready, run } = useSourceTest(props)
  return (
    <div className="space-y-2">
      <SourceTestButton
        sourceType={props.sourceType}
        ready={ready}
        loading={state.phase === 'loading'}
        onTest={run}
      />
      <SourceTestResult sourceType={props.sourceType} state={state} />
    </div>
  )
}
