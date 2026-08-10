'use client'

import { CircleCheckBig, CircleX, Clock, LoaderCircle, Square } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { PressRunStatus } from '@/lib/types/crawl-run'

export interface PressRunStatusListProps {
  pressStatuses: PressRunStatus[]
  /**
   * true면 서버 재시작 후 복구된 근사 스냅샷이라(I-022) 언론사별 상세를 신뢰할 수 없다 —
   * `target`이 `collected`와 같은 값으로 강제되어 "중단됨" 파생 판정이 항상 거짓이고,
   * 언론사 전체 실패도 복원되지 않는다. 목록 대신 런 레벨 안내 한 줄로 대체한다(D-030 결정 4).
   */
  recovered?: boolean
}

/**
 * 언론사별 상태 리스트(설계서 01 §③ 진행 중 / §⑧ 중단됨). `pressRunStatus` enum
 * (`waiting | running | done | failed`)에는 "중단됨"이 없다 — 새 값을 더하지 않고
 * `done`인데 `collected < target`인 경우를 파생으로 가른다(D-030 결정 3). 정상 완료된
 * 언론사는 항상 `collected === target`이므로 이 조건은 중단으로 도중에 멈춘 경우에만 참이다.
 */
function isAbortedPartial(item: PressRunStatus): boolean {
  return item.status === 'done' && item.collected < item.target
}

type DisplayStatus = 'waiting' | 'running' | 'done' | 'failed' | 'aborted'

const STATUS_LABEL: Record<DisplayStatus, string> = {
  waiting: '대기',
  running: '진행중',
  done: '완료',
  failed: '실패',
  aborted: '중단됨',
}

export function PressRunStatusList({ pressStatuses, recovered = false }: PressRunStatusListProps) {
  if (recovered) {
    return (
      <p className="text-sm text-muted-foreground">
        이 결과는 서버 재시작 후 복구된 값이라 언론사별 상세가 정확하지 않을 수 있어요.
      </p>
    )
  }

  return (
    <ScrollArea className="h-[240px] pr-3">
      <ul className="space-y-2">
        {pressStatuses.map((item) => {
          const displayStatus: DisplayStatus = isAbortedPartial(item) ? 'aborted' : item.status

          return (
            <li key={item.pressId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {displayStatus === 'waiting' && (
                  <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                {displayStatus === 'running' && (
                  <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                )}
                {displayStatus === 'done' && (
                  <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
                )}
                {displayStatus === 'failed' && (
                  <CircleX className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                {displayStatus === 'aborted' && (
                  <Square className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate">{item.name}</span>
              </span>
              <span
                className={
                  displayStatus === 'failed'
                    ? 'shrink-0 text-destructive'
                    : 'shrink-0 text-muted-foreground'
                }
              >
                {displayStatus === 'failed'
                  ? `${STATUS_LABEL.failed} (${item.failReason ?? '알 수 없는 오류'})`
                  : `${STATUS_LABEL[displayStatus]} (${item.collected}/${item.target}건)`}
              </span>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}
