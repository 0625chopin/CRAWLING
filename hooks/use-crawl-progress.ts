'use client'

import { useEffect, useRef, useState } from 'react'

import type { ApiFailure, ApiSuccess } from '@/lib/api/response'
import type { RunProgress } from '@/lib/types/crawl-run'

/** SSE 대신 폴링을 채택한 결정(docs/ROADMAP.md §결정 필요 사항 Q2)의 고정 주기. 언론사 수와 무관하게 항상 1초다. */
const POLL_INTERVAL_MS = 1000

/** 이 상태에 닿으면 폴링을 즉시 멈춘다(docs/screens/01-crawl-run.md §③ "폴링은 status가 종료 상태가 되면 멈춘다"). */
const TERMINAL_STATUSES: ReadonlySet<RunProgress['status']> = new Set([
  'done',
  'partial-failed',
  'failed',
  'aborted',
])

interface UseCrawlProgressResult {
  /** 아직 첫 응답을 받지 못했으면 null. */
  progress: RunProgress | null
  /** 화면에 그대로 노출 가능한 한국어 오류 메시지. 원시 오류(스택·영문)를 담지 않는다(docs/CONVENTIONS.md §7). */
  error: string | null
  /** 첫 응답을 기다리는 동안만 true — 이후 1초 재조회는 화면을 깜빡이지 않도록 다시 켜지 않는다. */
  isLoading: boolean
}

/**
 * `GET /api/crawl/{runId}`를 1초 간격으로 폴링한다. runId가 없으면(아직 실행 전) 아무것도
 * 하지 않는다 — 크롤링 실행 화면이 idle 상태에서도 이 훅을 미리 붙여 둘 수 있게 한다.
 *
 * 종료 상태(done/partial-failed/failed/aborted)를 받으면 그 응답을 마지막으로 반영하고 다음
 * 타이머를 걸지 않는다 — 무한 폴링 방지(Task 015 DoD). 그 외 오류(404·500·네트워크 오류)는
 * 종료 상태가 아니므로 폴링을 멈추지 않는다 — 디스크 지연 같은 일시적 실패를 영구 정지로 취급하지
 * 않고, 오류 메시지만 화면에 남긴 채 다음 주기에 다시 시도한다.
 */
// runId가 한 번도 추적되지 않았음을 나타내는 표식. 실제 runId(string)나 idle 상태(null/undefined)와
// 절대 겹치지 않아야 최초 렌더에서도 "바뀌었다" 분기를 확실히 타게 할 수 있다.
const UNSET: unique symbol = Symbol('crawl-progress-unset')

export function useCrawlProgress(runId: string | null | undefined): UseCrawlProgressResult {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [trackedRunId, setTrackedRunId] = useState<string | null | undefined | typeof UNSET>(UNSET)

  // runId가 바뀌면(최초 마운트 포함) 이전 실행의 진행 상태·오류가 화면에 남지 않도록 렌더 도중
  // 즉시 초기화한다. useEffect 본문에서 무조건 setState를 부르면 커밋마다 렌더가 한 번 더
  // 발생한다는 린트 경고(react-hooks/set-state-in-effect)가 있어, React가 권장하는 "prop이
  // 바뀔 때 state를 조정하는" 렌더 중 처리 패턴을 쓴다
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-when-a-prop-changes).
  if (runId !== trackedRunId) {
    setTrackedRunId(runId)
    setProgress(null)
    setError(null)
    setIsLoading(runId != null)
  }

  // 클로저 안의 setTimeout 콜백이 매번 최신 cancelled 플래그를 보도록 ref로 둔다 — effect
  // cleanup은 리렌더마다 새로 만들어지는 클로저가 아니라 이 ref 하나만 뒤집으면 된다.
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    if (!runId) return

    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      try {
        const response = await fetch(`/api/crawl/${runId}`)
        const body = (await response.json()) as ApiSuccess<RunProgress> | ApiFailure
        if (cancelledRef.current) return

        if (!body.ok) {
          // fail()이 만든 message는 이미 한국어라 그대로 노출해도 된다(docs/CONVENTIONS.md §6).
          setError(body.message)
          setIsLoading(false)
          timer = setTimeout(poll, POLL_INTERVAL_MS)
          return
        }

        setProgress(body.data)
        setError(null)
        setIsLoading(false)

        if (TERMINAL_STATUSES.has(body.data.status)) return
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        // fetch 자체가 실패한 경우(네트워크 끊김 등) — 원시 오류를 화면까지 흘리지 않는다.
        if (cancelledRef.current) return
        setError('진행 상태를 불러오지 못했습니다')
        setIsLoading(false)
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelledRef.current = true
      if (timer) clearTimeout(timer)
    }
  }, [runId])

  return { progress, error, isLoading }
}
